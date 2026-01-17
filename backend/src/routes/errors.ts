import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { query as dbQuery, queryOne } from '../database/connection';

export const errorsRouter = Router();

interface DeviceRow {
  id: string;
  device_id: string;
}

errorsRouter.post(
  '/log',
  [
    body('deviceId').isString().notEmpty(),
    body('platform').isIn(['ios', 'android']),
    body('errorType').isString().notEmpty(),
    body('errorMessage').optional().isString(),
    body('context').optional().isObject(),
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
      const { deviceId, platform, errorType, errorMessage, context } = req.body as {
        deviceId: string;
        platform: 'ios' | 'android';
        errorType: string;
        errorMessage?: string;
        context?: Record<string, unknown>;
      };

      let device = await queryOne<DeviceRow>(
        'SELECT id, device_id FROM devices WHERE device_id = $1',
        [deviceId]
      );

      if (!device) {
        const id = uuidv4();
        await dbQuery(
          `INSERT INTO devices (id, device_id, platform, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [id, deviceId, platform]
        );
        device = { id, device_id: deviceId };
      }

      const errorId = uuidv4();
      await dbQuery(
        `INSERT INTO error_logs (id, device_id, error_type, error_message, context, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [errorId, device.id, errorType, errorMessage ?? null, context ? JSON.stringify(context) : null]
      );

      res.json({
        success: true,
        data: { id: errorId },
      });
    } catch (error) {
      console.error('Error logging error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to log error',
      });
    }
  }
);
