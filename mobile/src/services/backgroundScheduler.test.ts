import BackgroundScheduler, {
  getScheduler,
  resetScheduler,
  BACKGROUND_TASK_NAME,
  BACKGROUND_FETCH_INTERVAL,
} from './backgroundScheduler';
import AiCaptionEngine from './aiEngine';

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
}));

jest.mock('expo-background-fetch', () => ({
  getStatusAsync: jest.fn().mockResolvedValue(2),
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
  BackgroundFetchStatus: { Available: 2 },
  BackgroundFetchResult: { NewData: 2, NoData: 1, Failed: 3 },
}));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    currentState: 'active',
  },
}));

jest.mock('../galleryScanner', () => ({
  getAssetsSince: jest.fn().mockResolvedValue([]),
}));

jest.mock('../metadataReader', () => ({
  checkImageHasCaption: jest.fn().mockResolvedValue({ hasCaption: false }),
}));

jest.mock('../../store', () => ({
  usePreferencesStore: {
    getState: () => ({
      preferences: {
        backgroundProcessing: true,
        aiMode: 'on-device',
      },
    }),
  },
  useProcessingStore: {
    getState: () => ({
      stats: {
        lastSyncAt: new Date(),
      },
      updateProcessingStats: jest.fn(),
    }),
  },
}));

describe('BackgroundScheduler', () => {
  let engine: AiCaptionEngine;

  beforeEach(async () => {
    resetScheduler();
    engine = new AiCaptionEngine({ mode: 'on-device' });
    await engine.initialize();
  });

  afterEach(() => {
    engine.dispose();
    resetScheduler();
  });

  describe('constants', () => {
    it('should export task name', () => {
      expect(BACKGROUND_TASK_NAME).toBe('memora-background-caption');
    });

    it('should export fetch interval', () => {
      expect(BACKGROUND_FETCH_INTERVAL).toBe(15 * 60);
    });
  });

  describe('initialization', () => {
    it('should initialize scheduler', async () => {
      const scheduler = new BackgroundScheduler();
      await expect(scheduler.initialize(engine)).resolves.not.toThrow();
    });

    it('should not double initialize', async () => {
      const scheduler = new BackgroundScheduler();
      await scheduler.initialize(engine);
      await scheduler.initialize(engine);
    });
  });

  describe('getState', () => {
    it('should return initial state', () => {
      const scheduler = new BackgroundScheduler();
      const state = scheduler.getState();

      expect(state.isRunning).toBe(false);
      expect(state.lastRunAt).toBeNull();
      expect(state.imagesProcessedToday).toBe(0);
    });
  });

  describe('getConfig', () => {
    it('should return default config', () => {
      const scheduler = new BackgroundScheduler();
      const config = scheduler.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.processOnWifiOnly).toBe(true);
      expect(config.maxDailyProcessing).toBe(100);
    });

    it('should merge custom config', () => {
      const scheduler = new BackgroundScheduler({
        maxDailyProcessing: 50,
        processOnWifiOnly: false,
      });
      const config = scheduler.getConfig();

      expect(config.maxDailyProcessing).toBe(50);
      expect(config.processOnWifiOnly).toBe(false);
    });
  });

  describe('updateConfig', () => {
    it('should update config', () => {
      const scheduler = new BackgroundScheduler();
      scheduler.updateConfig({ maxDailyProcessing: 200 });

      expect(scheduler.getConfig().maxDailyProcessing).toBe(200);
    });
  });

  describe('start and stop', () => {
    it('should start scheduler', async () => {
      const scheduler = new BackgroundScheduler();
      await scheduler.initialize(engine);

      await scheduler.start();

      expect(scheduler.getConfig().enabled).toBe(true);
    });

    it('should stop scheduler', async () => {
      const scheduler = new BackgroundScheduler();
      await scheduler.initialize(engine);

      scheduler.stop();

      expect(scheduler.getConfig().enabled).toBe(false);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const scheduler1 = getScheduler();
      const scheduler2 = getScheduler();

      expect(scheduler1).toBe(scheduler2);
    });

    it('should create new instance after reset', () => {
      const scheduler1 = getScheduler();
      resetScheduler();
      const scheduler2 = getScheduler();

      expect(scheduler1).not.toBe(scheduler2);
    });
  });

  describe('checkNewImages', () => {
    it('should return count of uncaptioned images', async () => {
      const scheduler = new BackgroundScheduler();
      await scheduler.initialize(engine);

      const count = await scheduler.checkNewImages();

      expect(typeof count).toBe('number');
    });
  });

  describe('dispose', () => {
    it('should clean up resources', async () => {
      const scheduler = new BackgroundScheduler();
      await scheduler.initialize(engine);

      await scheduler.dispose();
    });
  });
});
