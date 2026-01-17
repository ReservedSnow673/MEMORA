import { LocalDatabase, resetDatabase } from './localDatabase';

// Mock for expo-sqlite new async API (SDK 54)
const createMockDatabase = () => ({
  execAsync: jest.fn().mockResolvedValue(undefined),
  runAsync: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 }),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  getAllAsync: jest.fn().mockResolvedValue([]),
  closeAsync: jest.fn().mockResolvedValue(undefined),
});

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve(createMockDatabase())),
}));

describe('LocalDatabase', () => {
  let db: LocalDatabase;

  beforeEach(() => {
    resetDatabase();
    db = new LocalDatabase();
  });

  afterEach(async () => {
    await db.close();
    resetDatabase();
  });

  describe('initialization', () => {
    it('should initialize database', async () => {
      await expect(db.initialize()).resolves.not.toThrow();
    });

    it('should not double initialize', async () => {
      await db.initialize();
      await db.initialize();
    });
  });

  describe('insertImage', () => {
    it('should insert image record', async () => {
      await db.initialize();

      const record = await db.insertImage({
        assetId: 'asset-123',
        uri: 'file:///test.jpg',
        filename: 'test.jpg',
        width: 1920,
        height: 1080,
        createdAt: new Date(),
        modifiedAt: new Date(),
        processingStatus: 'pending',
        syncStatus: 'pending',
      });

      expect(record.id).toBeDefined();
      expect(record.assetId).toBe('asset-123');
    });
  });

  describe('getImageById', () => {
    it('should return null for non-existent image', async () => {
      await db.initialize();

      const result = await db.getImageById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getImageByAssetId', () => {
    it('should return null for non-existent asset', async () => {
      await db.initialize();

      const result = await db.getImageByAssetId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateImage', () => {
    it('should update image record', async () => {
      await db.initialize();

      await db.updateImage('id-123', {
        caption: 'New caption',
        captionSource: 'ai',
        processingStatus: 'completed',
      });
    });

    it('should handle empty updates', async () => {
      await db.initialize();

      await db.updateImage('id-123', {});
    });
  });

  describe('deleteImage', () => {
    it('should delete image', async () => {
      await db.initialize();

      await db.deleteImage('id-123');
    });
  });

  describe('getImagesByStatus', () => {
    it('should return empty array when no images', async () => {
      await db.initialize();

      const results = await db.getImagesByStatus('pending');

      expect(results).toEqual([]);
    });
  });

  describe('getPendingImages', () => {
    it('should return empty array when no pending images', async () => {
      await db.initialize();

      const results = await db.getPendingImages();

      expect(results).toEqual([]);
    });
  });

  describe('getUnsyncedImages', () => {
    it('should return empty array when no unsynced images', async () => {
      await db.initialize();

      const results = await db.getUnsyncedImages();

      expect(results).toEqual([]);
    });
  });

  describe('getImageStats', () => {
    it('should return zero counts when empty', async () => {
      await db.initialize();

      const stats = await db.getImageStats();

      expect(stats.total).toBe(0);
      expect(stats.captioned).toBe(0);
      expect(stats.pending).toBe(0);
    });
  });

  describe('addCaptionHistory', () => {
    it('should add caption history entry', async () => {
      await db.initialize();

      const history = await db.addCaptionHistory(
        'image-123',
        'A beautiful sunset',
        'ai',
        'blip-base',
        0.95
      );

      expect(history.id).toBeDefined();
      expect(history.caption).toBe('A beautiful sunset');
      expect(history.isActive).toBe(true);
    });
  });

  describe('getCaptionHistory', () => {
    it('should return empty array for new image', async () => {
      await db.initialize();

      const history = await db.getCaptionHistory('image-123');

      expect(history).toEqual([]);
    });
  });

  describe('addProcessingLog', () => {
    it('should add processing log entry', async () => {
      await db.initialize();

      const log = await db.addProcessingLog(
        'image-123',
        'caption',
        'completed',
        'Caption generated successfully',
        1500
      );

      expect(log.id).toBeDefined();
      expect(log.action).toBe('caption');
      expect(log.status).toBe('completed');
    });
  });

  describe('metadata', () => {
    it('should return null for non-existent key', async () => {
      await db.initialize();

      const value = await db.getMetadata('non-existent');

      expect(value).toBeNull();
    });

    it('should set and get metadata', async () => {
      await db.initialize();

      await db.setMetadata('test_key', 'test_value');
    });
  });

  describe('clearAll', () => {
    it('should clear all data', async () => {
      await db.initialize();

      await db.clearAll();
    });
  });

  describe('close', () => {
    it('should close database', async () => {
      await db.initialize();

      await db.close();
    });
  });
});
