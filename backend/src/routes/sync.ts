import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { query as dbQuery, queryOne, withTransaction } from '../database/connection';
import {
  Device,
  ProcessingState,
  CaptionHistory,
  SyncPullResponse,
  SyncPushResponse,
} from '../types';

export const syncRouter = Router();

interface DeviceRow {
  id: string;
  device_id: string;
  platform: 'ios' | 'android';
  created_at: Date;
  last_sync_at: Date | null;
}

interface ProcessingStateRow {
  id: string;
  device_id: string;
  image_hash: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  caption: string | null;
  model_used: 'on-device' | 'gemini' | 'gpt-5.2' | null;
  error_message: string | null;
  retry_count: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

interface CaptionHistoryRow {
  id: string;
  device_id: string;
  image_hash: string;
  caption: string;
  model_used: 'on-device' | 'gemini' | 'gpt-5.2';
  was_manual_edit: boolean;
  created_at: Date;
}

function mapProcessingStateRow(row: ProcessingStateRow): ProcessingState {
  return {
    id: row.id,
    deviceId: row.device_id,
    imageHash: row.image_hash,
    status: row.status,
    caption: row.caption,
    modelUsed: row.model_used,
    errorMessage: row.error_message,
    retryCount: row.retry_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCaptionHistoryRow(row: CaptionHistoryRow): CaptionHistory {
  return {
    id: row.id,
    deviceId: row.device_id,
    imageHash: row.image_hash,
    caption: row.caption,
    modelUsed: row.model_used,
    wasManualEdit: row.was_manual_edit,
    createdAt: row.created_at,
  };
}

async function getOrCreateDevice(
  deviceId: string,
  platform: 'ios' | 'android'
): Promise<Device> {
  let device = await queryOne<DeviceRow>(
    'SELECT * FROM devices WHERE device_id = $1',
    [deviceId]
  );

  if (!device) {
    const id = uuidv4();
    await dbQuery(
      `INSERT INTO devices (id, device_id, platform, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [id, deviceId, platform]
    );
    device = await queryOne<DeviceRow>(
      'SELECT * FROM devices WHERE id = $1',
      [id]
    );
  }

  if (!device) {
    throw new Error('Failed to create device');
  }

  return {
    id: device.id,
    deviceId: device.device_id,
    platform: device.platform,
    createdAt: device.created_at,
    lastSyncAt: device.last_sync_at,
  };
}

syncRouter.post(
  '/pull',
  [
    body('deviceId').isString().notEmpty(),
    body('platform').isIn(['ios', 'android']),
    body('lastPulledAt').isInt({ min: 0 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
      return;
    }

    try {
      const { deviceId, platform, lastPulledAt } = req.body as {
        deviceId: string;
        platform: 'ios' | 'android';
        lastPulledAt: number;
      };

      const device = await getOrCreateDevice(deviceId, platform);
      const lastPulledDate = new Date(lastPulledAt);
      const now = Date.now();

      const processingStates = await dbQuery<ProcessingStateRow>(
        `SELECT * FROM processing_state
         WHERE device_id = $1 AND updated_at > $2`,
        [device.id, lastPulledDate]
      );

      const captionHistories = await dbQuery<CaptionHistoryRow>(
        `SELECT * FROM caption_history
         WHERE device_id = $1 AND created_at > $2`,
        [device.id, lastPulledDate]
      );

      const created = processingStates
        .filter((p) => p.created_at > lastPulledDate && !p.deleted_at)
        .map(mapProcessingStateRow);

      const updated = processingStates
        .filter((p) => p.created_at <= lastPulledDate && !p.deleted_at)
        .map(mapProcessingStateRow);

      const deleted = processingStates
        .filter((p) => p.deleted_at !== null)
        .map((p) => p.id);

      await dbQuery(
        'UPDATE devices SET last_sync_at = NOW() WHERE id = $1',
        [device.id]
      );

      const response: SyncPullResponse = {
        changes: {
          processingState: { created, updated, deleted },
          captionHistory: {
            created: captionHistories.map(mapCaptionHistoryRow),
          },
        },
        timestamp: now,
      };

      res.json({ success: true, data: response });
    } catch (error) {
      console.error('Sync pull error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to pull changes',
      });
    }
  }
);

syncRouter.post(
  '/push',
  [
    body('deviceId').isString().notEmpty(),
    body('platform').isIn(['ios', 'android']),
    body('changes').isObject(),
    body('changes.processingState').isArray(),
    body('changes.captionHistory').isArray(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
      return;
    }

    try {
      const { deviceId, platform, changes } = req.body as {
        deviceId: string;
        platform: 'ios' | 'android';
        changes: {
          processingState: ProcessingState[];
          captionHistory: CaptionHistory[];
        };
      };

      const device = await getOrCreateDevice(deviceId, platform);
      const conflicts: string[] = [];

      await withTransaction(async (client) => {
        for (const state of changes.processingState) {
          const existing = await client.query(
            'SELECT updated_at FROM processing_state WHERE id = $1',
            [state.id]
          );

          if (
            existing.rows[0] &&
            new Date(existing.rows[0].updated_at) > new Date(state.updatedAt)
          ) {
            conflicts.push(state.id);
            continue;
          }

          await client.query(
            `INSERT INTO processing_state
             (id, device_id, image_hash, status, caption, model_used, error_message, retry_count, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO UPDATE SET
               status = EXCLUDED.status,
               caption = EXCLUDED.caption,
               model_used = EXCLUDED.model_used,
               error_message = EXCLUDED.error_message,
               retry_count = EXCLUDED.retry_count,
               updated_at = EXCLUDED.updated_at`,
            [
              state.id,
              device.id,
              state.imageHash,
              state.status,
              state.caption,
              state.modelUsed,
              state.errorMessage,
              state.retryCount,
              state.createdAt,
              state.updatedAt,
            ]
          );
        }

        for (const history of changes.captionHistory) {
          await client.query(
            `INSERT INTO caption_history
             (id, device_id, image_hash, caption, model_used, was_manual_edit, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO NOTHING`,
            [
              history.id,
              device.id,
              history.imageHash,
              history.caption,
              history.modelUsed,
              history.wasManualEdit,
              history.createdAt,
            ]
          );
        }
      });

      const response: SyncPushResponse = {
        success: true,
        conflicts,
      };

      res.json({ success: true, data: response });
    } catch (error) {
      console.error('Sync push error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to push changes',
      });
    }
  }
);
