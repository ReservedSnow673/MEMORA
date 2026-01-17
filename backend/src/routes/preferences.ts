import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { query as dbQuery, queryOne } from '../database/connection';
import { Preferences } from '../types';

export const preferencesRouter = Router();

interface PreferencesRow {
  device_id: string;
  background_enabled: boolean;
  ai_mode: 'on-device' | 'gemini' | 'gpt-5.2';
  auto_process_new: boolean;
  process_existing: boolean;
  wifi_only: boolean;
  charging_only: boolean;
  updated_at: Date;
}

interface DeviceRow {
  id: string;
  device_id: string;
}

function mapPreferencesRow(row: PreferencesRow, originalDeviceId: string): Preferences {
  return {
    deviceId: originalDeviceId,
    backgroundEnabled: row.background_enabled,
    aiMode: row.ai_mode,
    autoProcessNew: row.auto_process_new,
    processExisting: row.process_existing,
    wifiOnly: row.wifi_only,
    chargingOnly: row.charging_only,
    updatedAt: row.updated_at,
  };
}

function getDefaultPreferences(deviceId: string): Preferences {
  return {
    deviceId,
    backgroundEnabled: true,
    aiMode: 'on-device',
    autoProcessNew: true,
    processExisting: false,
    wifiOnly: true,
    chargingOnly: false,
    updatedAt: new Date(),
  };
}

preferencesRouter.get(
  '/:deviceId',
  [param('deviceId').isString().notEmpty()],
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
      const { deviceId } = req.params as { deviceId: string };

      const device = await queryOne<DeviceRow>(
        'SELECT id, device_id FROM devices WHERE device_id = $1',
        [deviceId]
      );

      if (!device) {
        res.json({
          success: true,
          data: getDefaultPreferences(deviceId),
        });
        return;
      }

      const prefs = await queryOne<PreferencesRow>(
        'SELECT * FROM preferences WHERE device_id = $1',
        [device.id]
      );

      if (!prefs) {
        res.json({
          success: true,
          data: getDefaultPreferences(deviceId),
        });
        return;
      }

      res.json({
        success: true,
        data: mapPreferencesRow(prefs, deviceId),
      });
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get preferences',
      });
    }
  }
);

preferencesRouter.put(
  '/:deviceId',
  [
    param('deviceId').isString().notEmpty(),
    body('platform').isIn(['ios', 'android']),
    body('backgroundEnabled').isBoolean(),
    body('aiMode').isIn(['on-device', 'gemini', 'gpt-5.2']),
    body('autoProcessNew').isBoolean(),
    body('processExisting').isBoolean(),
    body('wifiOnly').isBoolean(),
    body('chargingOnly').isBoolean(),
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
      const { deviceId } = req.params as { deviceId: string };
      const {
        platform,
        backgroundEnabled,
        aiMode,
        autoProcessNew,
        processExisting,
        wifiOnly,
        chargingOnly,
      } = req.body as {
        platform: 'ios' | 'android';
        backgroundEnabled: boolean;
        aiMode: 'on-device' | 'gemini' | 'gpt-5.2';
        autoProcessNew: boolean;
        processExisting: boolean;
        wifiOnly: boolean;
        chargingOnly: boolean;
      };

      let device = await queryOne<DeviceRow>(
        'SELECT id, device_id FROM devices WHERE device_id = $1',
        [deviceId]
      );

      if (!device) {
        const { v4: uuidv4 } = await import('uuid');
        const id = uuidv4();
        await dbQuery(
          `INSERT INTO devices (id, device_id, platform, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [id, deviceId, platform]
        );
        device = { id, device_id: deviceId };
      }

      await dbQuery(
        `INSERT INTO preferences
         (device_id, background_enabled, ai_mode, auto_process_new, process_existing, wifi_only, charging_only, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (device_id) DO UPDATE SET
           background_enabled = EXCLUDED.background_enabled,
           ai_mode = EXCLUDED.ai_mode,
           auto_process_new = EXCLUDED.auto_process_new,
           process_existing = EXCLUDED.process_existing,
           wifi_only = EXCLUDED.wifi_only,
           charging_only = EXCLUDED.charging_only,
           updated_at = NOW()`,
        [
          device.id,
          backgroundEnabled,
          aiMode,
          autoProcessNew,
          processExisting,
          wifiOnly,
          chargingOnly,
        ]
      );

      const updated = await queryOne<PreferencesRow>(
        'SELECT * FROM preferences WHERE device_id = $1',
        [device.id]
      );

      if (!updated) {
        throw new Error('Failed to retrieve updated preferences');
      }

      res.json({
        success: true,
        data: mapPreferencesRow(updated, deviceId),
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update preferences',
      });
    }
  }
);
