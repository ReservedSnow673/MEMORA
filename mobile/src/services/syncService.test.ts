import SyncService, { getSyncService, resetSyncService } from './syncService';

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn().mockReturnValue(() => {}),
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    type: 'wifi',
  }),
}));

jest.mock('../store', () => ({
  usePreferencesStore: {
    getState: () => ({
      preferences: {
        autoSync: true,
      },
    }),
  },
  useProcessingStore: {
    getState: () => ({
      stats: {},
    }),
  },
}));

describe('SyncService', () => {
  beforeEach(() => {
    resetSyncService();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    resetSyncService();
    jest.resetAllMocks();
  });

  describe('initialization', () => {
    it('should initialize service', async () => {
      const service = new SyncService();
      await expect(service.initialize()).resolves.not.toThrow();
    });
  });

  describe('addItem', () => {
    it('should add item to queue', async () => {
      const service = new SyncService();
      await service.initialize();

      const item = await service.addItem({
        assetId: 'asset-1',
        imageUri: 'file:///test.jpg',
        caption: 'Test caption',
        captionSource: 'xmp',
        aiModel: 'blip-base',
      });

      expect(item.id).toBeDefined();
      expect(item.syncStatus).toBe('pending');
      expect(service.getStats().totalPending).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return initial stats', () => {
      const service = new SyncService();
      const stats = service.getStats();

      expect(stats.totalPending).toBe(0);
      expect(stats.totalSynced).toBe(0);
      expect(stats.totalFailed).toBe(0);
      expect(stats.lastSyncAt).toBeNull();
    });
  });

  describe('getConfig', () => {
    it('should return default config', () => {
      const service = new SyncService();
      const config = service.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.wifiOnly).toBe(true);
      expect(config.batchSize).toBe(20);
    });

    it('should merge custom config', () => {
      const service = new SyncService({
        enabled: true,
        serverUrl: 'https://api.example.com',
      });
      const config = service.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.serverUrl).toBe('https://api.example.com');
    });
  });

  describe('updateConfig', () => {
    it('should update config', () => {
      const service = new SyncService();
      service.updateConfig({ enabled: true });

      expect(service.getConfig().enabled).toBe(true);
    });
  });

  describe('sync', () => {
    it('should not sync when disabled', async () => {
      const service = new SyncService({ enabled: false });
      await service.initialize();

      const stats = await service.sync();

      expect(stats.totalSynced).toBe(0);
    });

    it('should not sync without server URL', async () => {
      const service = new SyncService({ enabled: true, serverUrl: '' });
      await service.initialize();

      const stats = await service.sync();

      expect(stats.totalSynced).toBe(0);
    });
  });

  describe('getPendingItems', () => {
    it('should return pending items', async () => {
      const service = new SyncService();
      await service.initialize();

      await service.addItem({
        assetId: 'a1',
        imageUri: 'file:///1.jpg',
        caption: 'Caption 1',
        captionSource: 'xmp',
        aiModel: 'blip',
      });

      const pending = service.getPendingItems();

      expect(pending).toHaveLength(1);
    });
  });

  describe('getFailedItems', () => {
    it('should return empty array initially', () => {
      const service = new SyncService();
      const failed = service.getFailedItems();

      expect(failed).toHaveLength(0);
    });
  });

  describe('getSyncedItems', () => {
    it('should return empty array initially', () => {
      const service = new SyncService();
      const synced = service.getSyncedItems();

      expect(synced).toHaveLength(0);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const service1 = getSyncService();
      const service2 = getSyncService();

      expect(service1).toBe(service2);
    });

    it('should create new instance after reset', () => {
      const service1 = getSyncService();
      resetSyncService();
      const service2 = getSyncService();

      expect(service1).not.toBe(service2);
    });
  });

  describe('dispose', () => {
    it('should clean up resources', async () => {
      const service = new SyncService();
      await service.initialize();
      await service.addItem({
        assetId: 'a1',
        imageUri: 'file:///1.jpg',
        caption: 'Test',
        captionSource: 'xmp',
        aiModel: 'blip',
      });

      service.dispose();

      expect(service.getPendingItems()).toHaveLength(0);
    });
  });
});
