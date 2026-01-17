import request from 'supertest';
import { createApp } from '../app';
import { getTestPool } from '../test/setup';

const app = createApp();

describe('Errors API', () => {
  describe('POST /api/errors/log', () => {
    it('should log error for new device', async () => {
      const response = await request(app)
        .post('/api/errors/log')
        .send({
          deviceId: 'error-device-001',
          platform: 'ios',
          errorType: 'AI_INFERENCE_FAILED',
          errorMessage: 'Model failed to load',
          context: {
            modelName: 'blip-base',
            memoryUsage: 512,
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();

      const pool = getTestPool();
      const result = await pool.query(
        'SELECT * FROM error_logs WHERE error_type = $1',
        ['AI_INFERENCE_FAILED']
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].error_message).toBe('Model failed to load');
    });

    it('should log error without optional fields', async () => {
      const response = await request(app)
        .post('/api/errors/log')
        .send({
          deviceId: 'error-device-002',
          platform: 'android',
          errorType: 'PERMISSION_DENIED',
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      const pool = getTestPool();
      const result = await pool.query(
        'SELECT * FROM error_logs WHERE error_type = $1',
        ['PERMISSION_DENIED']
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].error_message).toBeNull();
      expect(result.rows[0].context).toBeNull();
    });

    it('should log error for existing device', async () => {
      const pool = getTestPool();
      
      await pool.query(
        `INSERT INTO devices (device_id, platform) VALUES ($1, $2)`,
        ['existing-error-device', 'ios']
      );

      const response = await request(app)
        .post('/api/errors/log')
        .send({
          deviceId: 'existing-error-device',
          platform: 'ios',
          errorType: 'NETWORK_TIMEOUT',
          errorMessage: 'Request timed out after 30s',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 for missing error type', async () => {
      const response = await request(app)
        .post('/api/errors/log')
        .send({
          deviceId: 'test-device',
          platform: 'ios',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for empty device id', async () => {
      const response = await request(app)
        .post('/api/errors/log')
        .send({
          deviceId: '',
          platform: 'ios',
          errorType: 'TEST_ERROR',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle complex context objects', async () => {
      const complexContext = {
        stack: 'Error: something\n  at file.ts:10',
        nested: {
          level1: {
            level2: {
              value: 42,
            },
          },
        },
        array: [1, 2, 3],
      };

      const response = await request(app)
        .post('/api/errors/log')
        .send({
          deviceId: 'complex-context-device',
          platform: 'android',
          errorType: 'COMPLEX_ERROR',
          context: complexContext,
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      const pool = getTestPool();
      const result = await pool.query(
        'SELECT context FROM error_logs WHERE error_type = $1',
        ['COMPLEX_ERROR']
      );
      expect(result.rows[0].context.nested.level1.level2.value).toBe(42);
    });
  });
});
