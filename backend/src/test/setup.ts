import { Pool } from 'pg';

let testPool: Pool | null = null;

export function getTestPool(): Pool {
  if (!testPool) {
    testPool = new Pool({
      connectionString: process.env['TEST_DATABASE_URL'] ?? 'postgresql://localhost:5432/memora_test',
      max: 5,
    });
  }
  return testPool;
}

export async function closeTestPool(): Promise<void> {
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
}

export async function setupTestDatabase(): Promise<void> {
  const pool = getTestPool();

  await pool.query('DROP TABLE IF EXISTS error_logs CASCADE');
  await pool.query('DROP TABLE IF EXISTS preferences CASCADE');
  await pool.query('DROP TABLE IF EXISTS caption_history CASCADE');
  await pool.query('DROP TABLE IF EXISTS processing_state CASCADE');
  await pool.query('DROP TABLE IF EXISTS devices CASCADE');

  await pool.query(`
    CREATE TABLE devices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id VARCHAR(255) UNIQUE NOT NULL,
      platform VARCHAR(10) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      last_sync_at TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE processing_state (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      image_hash VARCHAR(64) NOT NULL,
      status VARCHAR(20) NOT NULL,
      caption TEXT,
      model_used VARCHAR(20),
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      deleted_at TIMESTAMP,
      UNIQUE(device_id, image_hash)
    )
  `);

  await pool.query(`
    CREATE TABLE caption_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      image_hash VARCHAR(64) NOT NULL,
      caption TEXT NOT NULL,
      model_used VARCHAR(20) NOT NULL,
      was_manual_edit BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE preferences (
      device_id UUID PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
      background_enabled BOOLEAN DEFAULT TRUE,
      ai_mode VARCHAR(20) DEFAULT 'on-device',
      auto_process_new BOOLEAN DEFAULT TRUE,
      process_existing BOOLEAN DEFAULT FALSE,
      wifi_only BOOLEAN DEFAULT TRUE,
      charging_only BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE error_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      error_type VARCHAR(50) NOT NULL,
      error_message TEXT,
      context JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

export async function cleanupTestData(): Promise<void> {
  const pool = getTestPool();
  await pool.query('DELETE FROM error_logs');
  await pool.query('DELETE FROM preferences');
  await pool.query('DELETE FROM caption_history');
  await pool.query('DELETE FROM processing_state');
  await pool.query('DELETE FROM devices');
}

beforeAll(async () => {
  await setupTestDatabase();
});

afterEach(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await closeTestPool();
});

jest.mock('../database/connection', () => {
  const original = jest.requireActual('../database/connection');
  return {
    ...original,
    getPool: () => getTestPool(),
    healthCheck: async () => {
      try {
        await getTestPool().query('SELECT 1');
        return true;
      } catch {
        return false;
      }
    },
    query: async <T>(text: string, params?: unknown[]): Promise<T[]> => {
      const result = await getTestPool().query(text, params);
      return result.rows as T[];
    },
    queryOne: async <T>(text: string, params?: unknown[]): Promise<T | null> => {
      const result = await getTestPool().query(text, params);
      return (result.rows[0] as T) ?? null;
    },
    withTransaction: async <T>(callback: (client: any) => Promise<T>): Promise<T> => {
      const client = await getTestPool().connect();
      try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
});
