import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('Health API', () => {
  describe('GET /api/health', () => {
    it('should return healthy status when database is connected', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.database).toBe('connected');
      expect(response.body.data.timestamp).toBeDefined();
    });
  });
});
