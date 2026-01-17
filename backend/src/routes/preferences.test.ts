import request from 'supertest';
import { createApp } from '../app';
import { getTestPool } from '../test/setup';

const app = createApp();

describe('Preferences API', () => {
  describe('GET /api/preferences/:deviceId', () => {
    it('should return default preferences for unknown device', async () => {
      const response = await request(app)
        .get('/api/preferences/unknown-device')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deviceId).toBe('unknown-device');
      expect(response.body.data.backgroundEnabled).toBe(true);
      expect(response.body.data.aiMode).toBe('on-device');
      expect(response.body.data.autoProcessNew).toBe(true);
      expect(response.body.data.processExisting).toBe(false);
      expect(response.body.data.wifiOnly).toBe(true);
      expect(response.body.data.chargingOnly).toBe(false);
    });

    it('should return stored preferences for known device', async () => {
      const pool = getTestPool();
      
      const deviceResult = await pool.query(
        `INSERT INTO devices (device_id, platform) VALUES ($1, $2) RETURNING id`,
        ['prefs-device-001', 'ios']
      );
      const deviceId = deviceResult.rows[0].id;

      await pool.query(
        `INSERT INTO preferences (device_id, background_enabled, ai_mode, wifi_only)
         VALUES ($1, $2, $3, $4)`,
        [deviceId, false, 'gemini', false]
      );

      const response = await request(app)
        .get('/api/preferences/prefs-device-001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.backgroundEnabled).toBe(false);
      expect(response.body.data.aiMode).toBe('gemini');
      expect(response.body.data.wifiOnly).toBe(false);
    });

    it('should return default preferences when device exists but no prefs set', async () => {
      const pool = getTestPool();
      
      await pool.query(
        `INSERT INTO devices (device_id, platform) VALUES ($1, $2)`,
        ['no-prefs-device', 'android']
      );

      const response = await request(app)
        .get('/api/preferences/no-prefs-device')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.backgroundEnabled).toBe(true);
      expect(response.body.data.aiMode).toBe('on-device');
    });
  });

  describe('PUT /api/preferences/:deviceId', () => {
    it('should create preferences for new device', async () => {
      const response = await request(app)
        .put('/api/preferences/new-prefs-device')
        .send({
          platform: 'ios',
          backgroundEnabled: false,
          aiMode: 'gpt-5.2',
          autoProcessNew: false,
          processExisting: true,
          wifiOnly: false,
          chargingOnly: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.backgroundEnabled).toBe(false);
      expect(response.body.data.aiMode).toBe('gpt-5.2');
      expect(response.body.data.processExisting).toBe(true);
      expect(response.body.data.chargingOnly).toBe(true);

      const pool = getTestPool();
      const result = await pool.query(
        'SELECT * FROM devices WHERE device_id = $1',
        ['new-prefs-device']
      );
      expect(result.rows.length).toBe(1);
    });

    it('should update existing preferences', async () => {
      const pool = getTestPool();
      
      const deviceResult = await pool.query(
        `INSERT INTO devices (device_id, platform) VALUES ($1, $2) RETURNING id`,
        ['update-prefs-device', 'android']
      );
      const deviceId = deviceResult.rows[0].id;

      await pool.query(
        `INSERT INTO preferences (device_id, ai_mode) VALUES ($1, $2)`,
        [deviceId, 'on-device']
      );

      const response = await request(app)
        .put('/api/preferences/update-prefs-device')
        .send({
          platform: 'android',
          backgroundEnabled: true,
          aiMode: 'gemini',
          autoProcessNew: true,
          processExisting: false,
          wifiOnly: true,
          chargingOnly: false,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.aiMode).toBe('gemini');
    });

    it('should return 400 for invalid ai mode', async () => {
      const response = await request(app)
        .put('/api/preferences/invalid-mode-device')
        .send({
          platform: 'ios',
          backgroundEnabled: true,
          aiMode: 'invalid-mode',
          autoProcessNew: true,
          processExisting: false,
          wifiOnly: true,
          chargingOnly: false,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .put('/api/preferences/missing-fields-device')
        .send({
          platform: 'ios',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate platform field', async () => {
      const response = await request(app)
        .put('/api/preferences/invalid-platform')
        .send({
          platform: 'windows',
          backgroundEnabled: true,
          aiMode: 'on-device',
          autoProcessNew: true,
          processExisting: false,
          wifiOnly: true,
          chargingOnly: false,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
