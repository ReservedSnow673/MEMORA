import * as SQLite from 'expo-sqlite';

export interface ImageRecord {
  id: string;
  assetId: string;
  uri: string;
  filename: string;
  width: number;
  height: number;
  createdAt: Date;
  modifiedAt: Date;
  caption?: string;
  captionSource?: 'xmp' | 'exif' | 'iptc' | 'ai';
  captionGeneratedAt?: Date;
  aiModel?: string;
  confidence?: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  errorMessage?: string;
  syncStatus: 'pending' | 'synced' | 'failed';
  syncedAt?: Date;
}

export interface CaptionHistory {
  id: string;
  imageId: string;
  caption: string;
  source: 'xmp' | 'exif' | 'iptc' | 'ai' | 'manual';
  aiModel?: string;
  confidence?: number;
  createdAt: Date;
  isActive: boolean;
}

export interface ProcessingLog {
  id: string;
  imageId: string;
  action: 'scan' | 'caption' | 'embed' | 'sync' | 'error';
  status: 'started' | 'completed' | 'failed';
  details?: string;
  durationMs?: number;
  createdAt: Date;
}

const DB_NAME = 'memora.db';
const DB_VERSION = 1;

class LocalDatabase {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.db = await SQLite.openDatabaseAsync(DB_NAME);
    await this.createTables();
    await this.runMigrations();

    this.isInitialized = true;
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        asset_id TEXT UNIQUE NOT NULL,
        uri TEXT NOT NULL,
        filename TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        modified_at INTEGER NOT NULL,
        caption TEXT,
        caption_source TEXT,
        caption_generated_at INTEGER,
        ai_model TEXT,
        confidence REAL,
        processing_status TEXT DEFAULT 'pending',
        error_message TEXT,
        sync_status TEXT DEFAULT 'pending',
        synced_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_images_asset_id ON images(asset_id);
      CREATE INDEX IF NOT EXISTS idx_images_processing_status ON images(processing_status);
      CREATE INDEX IF NOT EXISTS idx_images_sync_status ON images(sync_status);
      CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at);

      CREATE TABLE IF NOT EXISTS caption_history (
        id TEXT PRIMARY KEY,
        image_id TEXT NOT NULL,
        caption TEXT NOT NULL,
        source TEXT NOT NULL,
        ai_model TEXT,
        confidence REAL,
        created_at INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_caption_history_image_id ON caption_history(image_id);

      CREATE TABLE IF NOT EXISTS processing_log (
        id TEXT PRIMARY KEY,
        image_id TEXT NOT NULL,
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        details TEXT,
        duration_ms INTEGER,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_processing_log_image_id ON processing_log(image_id);
      CREATE INDEX IF NOT EXISTS idx_processing_log_created_at ON processing_log(created_at);

      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  private async runMigrations(): Promise<void> {
    const currentVersion = await this.getMetadata('db_version');
    const version = currentVersion ? parseInt(currentVersion, 10) : 0;

    if (version < DB_VERSION) {
      await this.setMetadata('db_version', DB_VERSION.toString());
    }
  }

  async insertImage(image: Omit<ImageRecord, 'id'>): Promise<ImageRecord> {
    if (!this.db) throw new Error('Database not initialized');

    const id = this.generateId();
    const record: ImageRecord = { id, ...image };

    await this.db.runAsync(
      `INSERT INTO images (
        id, asset_id, uri, filename, width, height,
        created_at, modified_at, caption, caption_source,
        caption_generated_at, ai_model, confidence,
        processing_status, error_message, sync_status, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.assetId,
        record.uri,
        record.filename,
        record.width,
        record.height,
        record.createdAt.getTime(),
        record.modifiedAt.getTime(),
        record.caption ?? null,
        record.captionSource ?? null,
        record.captionGeneratedAt?.getTime() ?? null,
        record.aiModel ?? null,
        record.confidence ?? null,
        record.processingStatus,
        record.errorMessage ?? null,
        record.syncStatus,
        record.syncedAt?.getTime() ?? null,
      ]
    );

    return record;
  }

  async getImageById(id: string): Promise<ImageRecord | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM images WHERE id = ?',
      [id]
    );

    if (!row) return null;
    return this.mapToImageRecord(row);
  }

  async getImageByAssetId(assetId: string): Promise<ImageRecord | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM images WHERE asset_id = ?',
      [assetId]
    );

    if (!row) return null;
    return this.mapToImageRecord(row);
  }

  async updateImage(id: string, updates: Partial<ImageRecord>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.caption !== undefined) {
      fields.push('caption = ?');
      values.push(updates.caption ?? null);
    }
    if (updates.captionSource !== undefined) {
      fields.push('caption_source = ?');
      values.push(updates.captionSource ?? null);
    }
    if (updates.captionGeneratedAt !== undefined) {
      fields.push('caption_generated_at = ?');
      values.push(updates.captionGeneratedAt?.getTime() ?? null);
    }
    if (updates.aiModel !== undefined) {
      fields.push('ai_model = ?');
      values.push(updates.aiModel ?? null);
    }
    if (updates.confidence !== undefined) {
      fields.push('confidence = ?');
      values.push(updates.confidence ?? null);
    }
    if (updates.processingStatus !== undefined) {
      fields.push('processing_status = ?');
      values.push(updates.processingStatus);
    }
    if (updates.errorMessage !== undefined) {
      fields.push('error_message = ?');
      values.push(updates.errorMessage ?? null);
    }
    if (updates.syncStatus !== undefined) {
      fields.push('sync_status = ?');
      values.push(updates.syncStatus);
    }
    if (updates.syncedAt !== undefined) {
      fields.push('synced_at = ?');
      values.push(updates.syncedAt?.getTime() ?? null);
    }

    if (fields.length === 0) return;

    values.push(id);

    await this.db.runAsync(
      `UPDATE images SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteImage(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM images WHERE id = ?', [id]);
  }

  async getImagesByStatus(status: ImageRecord['processingStatus']): Promise<ImageRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM images WHERE processing_status = ? ORDER BY created_at DESC',
      [status]
    );

    return rows.map(row => this.mapToImageRecord(row));
  }

  async getPendingImages(limit = 50): Promise<ImageRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM images WHERE processing_status = ? ORDER BY created_at DESC LIMIT ?',
      ['pending', limit]
    );

    return rows.map(row => this.mapToImageRecord(row));
  }

  async getUnsyncedImages(): Promise<ImageRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<Record<string, unknown>>(
      "SELECT * FROM images WHERE sync_status = 'pending' AND processing_status = 'completed'"
    );

    return rows.map(row => this.mapToImageRecord(row));
  }

  async getImageStats(): Promise<{
    total: number;
    captioned: number;
    pending: number;
    failed: number;
    synced: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const total = await this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM images');
    const captioned = await this.db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM images WHERE processing_status = 'completed'"
    );
    const pending = await this.db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM images WHERE processing_status = 'pending'"
    );
    const failed = await this.db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM images WHERE processing_status = 'failed'"
    );
    const synced = await this.db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM images WHERE sync_status = 'synced'"
    );

    return {
      total: total?.count ?? 0,
      captioned: captioned?.count ?? 0,
      pending: pending?.count ?? 0,
      failed: failed?.count ?? 0,
      synced: synced?.count ?? 0,
    };
  }

  async addCaptionHistory(
    imageId: string,
    caption: string,
    source: CaptionHistory['source'],
    aiModel?: string,
    confidence?: number
  ): Promise<CaptionHistory> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'UPDATE caption_history SET is_active = 0 WHERE image_id = ?',
      [imageId]
    );

    const id = this.generateId();
    const history: CaptionHistory = {
      id,
      imageId,
      caption,
      source,
      aiModel,
      confidence,
      createdAt: new Date(),
      isActive: true,
    };

    await this.db.runAsync(
      `INSERT INTO caption_history (
        id, image_id, caption, source, ai_model, confidence, created_at, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        history.id,
        history.imageId,
        history.caption,
        history.source,
        history.aiModel ?? null,
        history.confidence ?? null,
        history.createdAt.getTime(),
        history.isActive ? 1 : 0,
      ]
    );

    return history;
  }

  async getCaptionHistory(imageId: string): Promise<CaptionHistory[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM caption_history WHERE image_id = ? ORDER BY created_at DESC',
      [imageId]
    );

    return rows.map(row => this.mapToCaptionHistory(row));
  }

  async addProcessingLog(
    imageId: string,
    action: ProcessingLog['action'],
    status: ProcessingLog['status'],
    details?: string,
    durationMs?: number
  ): Promise<ProcessingLog> {
    if (!this.db) throw new Error('Database not initialized');

    const id = this.generateId();
    const log: ProcessingLog = {
      id,
      imageId,
      action,
      status,
      details,
      durationMs,
      createdAt: new Date(),
    };

    await this.db.runAsync(
      `INSERT INTO processing_log (
        id, image_id, action, status, details, duration_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        log.id,
        log.imageId,
        log.action,
        log.status,
        log.details ?? null,
        log.durationMs ?? null,
        log.createdAt.getTime(),
      ]
    );

    return log;
  }

  async getMetadata(key: string): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync<{ value: string }>(
      'SELECT value FROM metadata WHERE key = ?',
      [key]
    );

    return row?.value ?? null;
  }

  async setMetadata(key: string, value: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT OR REPLACE INTO metadata (key, value, updated_at) VALUES (?, ?, ?)`,
      [key, value, Date.now()]
    );
  }

  async clearAll(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      DELETE FROM processing_log;
      DELETE FROM caption_history;
      DELETE FROM images;
    `);
  }

  private mapToImageRecord(row: Record<string, unknown>): ImageRecord {
    return {
      id: row.id as string,
      assetId: row.asset_id as string,
      uri: row.uri as string,
      filename: row.filename as string,
      width: row.width as number,
      height: row.height as number,
      createdAt: new Date(row.created_at as number),
      modifiedAt: new Date(row.modified_at as number),
      caption: row.caption as string | undefined,
      captionSource: row.caption_source as ImageRecord['captionSource'],
      captionGeneratedAt: row.caption_generated_at ? new Date(row.caption_generated_at as number) : undefined,
      aiModel: row.ai_model as string | undefined,
      confidence: row.confidence as number | undefined,
      processingStatus: row.processing_status as ImageRecord['processingStatus'],
      errorMessage: row.error_message as string | undefined,
      syncStatus: row.sync_status as ImageRecord['syncStatus'],
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : undefined,
    };
  }

  private mapToCaptionHistory(row: Record<string, unknown>): CaptionHistory {
    return {
      id: row.id as string,
      imageId: row.image_id as string,
      caption: row.caption as string,
      source: row.source as CaptionHistory['source'],
      aiModel: row.ai_model as string | undefined,
      confidence: row.confidence as number | undefined,
      createdAt: new Date(row.created_at as number),
      isActive: row.is_active === 1,
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
    }
    this.db = null;
    this.isInitialized = false;
  }
}

let dbInstance: LocalDatabase | null = null;

export function getDatabase(): LocalDatabase {
  if (!dbInstance) {
    dbInstance = new LocalDatabase();
  }
  return dbInstance;
}

export async function initializeDatabase(): Promise<LocalDatabase> {
  const db = getDatabase();
  await db.initialize();
  return db;
}

export function resetDatabase(): void {
  dbInstance?.close();
  dbInstance = null;
}

export { LocalDatabase };
export default LocalDatabase;
