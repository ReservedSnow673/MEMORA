import request from 'supertest';
import { createApp } from '../app';
import { getTestPool } from '../test/setup';

const app = createApp();

describe('Sync API', () => {
  describe('POST /api/sync/pull', () => {
    it('should return empty changes for new device', async () => {
      const response = await request(app)
        .post('/api/sync/pull')
        .send({
          deviceId: 'test-device-001',
          platform: 'ios',
          lastPulledAt: 0,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.changes.processingState.created).toEqual([]);
      expect(response.body.data.changes.processingState.updated).toEqual([]);
      expect(response.body.data.changes.processingState.deleted).toEqual([]);
      expect(response.body.data.changes.captionHistory.created).toEqual([]);
      expect(response.body.data.timestamp).toBeGreaterThan(0);
    });

    it('should return changes since last pull timestamp', async () => {
      const pool = getTestPool();
      
      const deviceResult = await pool.query(
        `INSERT INTO devices (device_id, platform) VALUES ($1, $2) RETURNING id`,
        ['test-device-002', 'android']
      );
      const deviceId = deviceResult.rows[0].id;

      await pool.query(
        `INSERT INTO processing_state (device_id, image_hash, status, caption, model_used)
         VALUES ($1, $2, $3, $4, $5)`,
        [deviceId, 'abc123', 'completed', 'A beautiful sunset', 'on-device']
      );

      const response = await request(app)
        .post('/api/sync/pull')
        .send({
          deviceId: 'test-device-002',
          platform: 'android',
          lastPulledAt: 0,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.changes.processingState.created.length).toBe(1);
      expect(response.body.data.changes.processingState.created[0].imageHash).toBe('abc123');
      expect(response.body.data.changes.processingState.created[0].caption).toBe('A beautiful sunset');
    });

    it('should return 400 for invalid request body', async () => {
      const response = await request(app)
        .post('/api/sync/pull')
        .send({
          deviceId: '',
          platform: 'invalid',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should create device if not exists', async () => {
      const response = await request(app)
        .post('/api/sync/pull')
        .send({
          deviceId: 'new-device-001',
          platform: 'ios',
          lastPulledAt: 0,
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      const pool = getTestPool();
      const result = await pool.query(
        'SELECT * FROM devices WHERE device_id = $1',
        ['new-device-001']
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].platform).toBe('ios');
    });

    it('should update last_sync_at on pull', async () => {
      await request(app)
        .post('/api/sync/pull')
        .send({
          deviceId: 'sync-time-device',
          platform: 'android',
          lastPulledAt: 0,
        })
        .expect(200);

      const pool = getTestPool();
      const result = await pool.query(
        'SELECT last_sync_at FROM devices WHERE device_id = $1',
        ['sync-time-device']
      );
      expect(result.rows[0].last_sync_at).not.toBeNull();
    });
  });

  describe('POST /api/sync/push', () => {
    it('should push new processing state', async () => {
      const response = await request(app)
        .post('/api/sync/push')
        .send({
          deviceId: 'push-device-001',
          platform: 'ios',
          changes: {
            processingState: [
              {
                id: '550e8400-e29b-41d4-a716-446655440000',
                imageHash: 'def456',
                status: 'completed',
                caption: 'A cat sitting on a couch',
                modelUsed: 'gemini',
                errorMessage: null,
                retryCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            captionHistory: [],
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
      expect(response.body.data.conflicts).toEqual([]);

      const pool = getTestPool();
      const result = await pool.query(
        'SELECT caption FROM processing_state WHERE image_hash = $1',
        ['def456']
      );
      expect(result.rows[0].caption).toBe('A cat sitting on a couch');
    });

    it('should push caption history', async () => {
      const response = await request(app)
        .post('/api/sync/push')
        .send({
          deviceId: 'history-device-001',
          platform: 'android',
          changes: {
            processingState: [],
            captionHistory: [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                imageHash: 'ghi789',
                caption: 'Original caption',
                modelUsed: 'on-device',
                wasManualEdit: false,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      const pool = getTestPool();
      const result = await pool.query(
        'SELECT caption FROM caption_history WHERE image_hash = $1',
        ['ghi789']
      );
      expect(result.rows[0].caption).toBe('Original caption');
    });

    it('should detect conflicts on concurrent updates', async () => {
      const pool = getTestPool();
      
      const deviceResult = await pool.query(
        `INSERT INTO devices (device_id, platform) VALUES ($1, $2) RETURNING id`,
        ['conflict-device', 'ios']
      );
      const deviceId = deviceResult.rows[0].id;

      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 10);

      await pool.query(
        `INSERT INTO processing_state (id, device_id, image_hash, status, updated_at)
         VALUES ($1, $2, $3, $4, $5)`,
        ['550e8400-e29b-41d4-a716-446655440002', deviceId, 'conflict-hash', 'completed', futureDate]
      );

      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 10);

      const response = await request(app)
        .post('/api/sync/push')
        .send({
          deviceId: 'conflict-device',
          platform: 'ios',
          changes: {
            processingState: [
              {
                id: '550e8400-e29b-41d4-a716-446655440002',
                imageHash: 'conflict-hash',
                status: 'failed',
                caption: null,
                modelUsed: null,
                errorMessage: 'Test error',
                retryCount: 1,
                createdAt: pastDate.toISOString(),
                updatedAt: pastDate.toISOString(),
              },
            ],
            captionHistory: [],
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conflicts).toContain('550e8400-e29b-41d4-a716-446655440002');
    });

    it('should return 400 for invalid request body', async () => {
      const response = await request(app)
        .post('/api/sync/push')
        .send({
          deviceId: 'test',
          changes: 'invalid',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
