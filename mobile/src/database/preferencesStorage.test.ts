import PreferencesStorage, {
  getPreferencesStorage,
  resetPreferencesStorage,
  DEFAULT_PREFERENCES,
} from './preferencesStorage';

let mockStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys: string[]) => {
    keys.forEach((key) => delete mockStorage[key]);
    return Promise.resolve();
  }),
}));

describe('PreferencesStorage', () => {
  beforeEach(() => {
    mockStorage = {};
    resetPreferencesStorage();
  });

  describe('load', () => {
    it('should return default preferences when empty', async () => {
      const storage = new PreferencesStorage();

      const prefs = await storage.load();

      expect(prefs).toEqual(DEFAULT_PREFERENCES);
    });

    it('should load stored preferences', async () => {
      mockStorage.memora_preferences = JSON.stringify({
        aiMode: 'cloud',
        autoProcess: false,
      });
      const storage = new PreferencesStorage();

      const prefs = await storage.load();

      expect(prefs.aiMode).toBe('cloud');
      expect(prefs.autoProcess).toBe(false);
      expect(prefs.backgroundProcessing).toBe(true);
    });
  });

  describe('save', () => {
    it('should save preferences', async () => {
      const storage = new PreferencesStorage();
      const prefs = { ...DEFAULT_PREFERENCES, aiMode: 'hybrid' as const };

      await storage.save(prefs);

      expect(mockStorage.memora_preferences).toBeDefined();
      const stored = JSON.parse(mockStorage.memora_preferences);
      expect(stored.aiMode).toBe('hybrid');
    });

    it('should notify listeners', async () => {
      const storage = new PreferencesStorage();
      const listener = jest.fn();
      storage.subscribe(listener);

      await storage.save({ ...DEFAULT_PREFERENCES, aiMode: 'cloud' });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ aiMode: 'cloud' })
      );
    });
  });

  describe('update', () => {
    it('should merge updates with existing preferences', async () => {
      const storage = new PreferencesStorage();
      await storage.load();

      const updated = await storage.update({ autoProcess: false });

      expect(updated.autoProcess).toBe(false);
      expect(updated.aiMode).toBe('on-device');
    });
  });

  describe('get', () => {
    it('should return cached preferences', async () => {
      const storage = new PreferencesStorage();
      await storage.load();

      const prefs1 = await storage.get();
      const prefs2 = await storage.get();

      expect(prefs1).toEqual(prefs2);
    });

    it('should load if not cached', async () => {
      const storage = new PreferencesStorage();

      const prefs = await storage.get();

      expect(prefs).toBeDefined();
    });
  });

  describe('reset', () => {
    it('should reset to default preferences', async () => {
      const storage = new PreferencesStorage();
      await storage.update({ aiMode: 'cloud' });

      const reset = await storage.reset();

      expect(reset).toEqual(DEFAULT_PREFERENCES);
    });
  });

  describe('subscribe', () => {
    it('should add listener', async () => {
      const storage = new PreferencesStorage();
      const listener = jest.fn();

      storage.subscribe(listener);
      await storage.save({ ...DEFAULT_PREFERENCES });

      expect(listener).toHaveBeenCalled();
    });

    it('should unsubscribe', async () => {
      const storage = new PreferencesStorage();
      const listener = jest.fn();

      const unsubscribe = storage.subscribe(listener);
      unsubscribe();
      await storage.save({ ...DEFAULT_PREFERENCES });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('onboarding', () => {
    it('should return false when not complete', async () => {
      const storage = new PreferencesStorage();

      const complete = await storage.isOnboardingComplete();

      expect(complete).toBe(false);
    });

    it('should set onboarding complete', async () => {
      const storage = new PreferencesStorage();

      await storage.setOnboardingComplete(true);
      const complete = await storage.isOnboardingComplete();

      expect(complete).toBe(true);
    });
  });

  describe('lastSyncTime', () => {
    it('should return null when not set', async () => {
      const storage = new PreferencesStorage();

      const lastSync = await storage.getLastSyncTime();

      expect(lastSync).toBeNull();
    });

    it('should set and get last sync time', async () => {
      const storage = new PreferencesStorage();
      const date = new Date();

      await storage.setLastSyncTime(date);
      const lastSync = await storage.getLastSyncTime();

      expect(lastSync?.getTime()).toBe(date.getTime());
    });
  });

  describe('deviceId', () => {
    it('should generate device id', async () => {
      const storage = new PreferencesStorage();

      const deviceId = await storage.getDeviceId();

      expect(deviceId).toMatch(/^device-\d+-[a-z0-9]+$/);
    });

    it('should return same device id on subsequent calls', async () => {
      const storage = new PreferencesStorage();

      const id1 = await storage.getDeviceId();
      const id2 = await storage.getDeviceId();

      expect(id1).toBe(id2);
    });
  });

  describe('clearAll', () => {
    it('should clear all storage', async () => {
      const storage = new PreferencesStorage();
      await storage.save({ ...DEFAULT_PREFERENCES, aiMode: 'cloud' });

      await storage.clearAll();
      const prefs = await storage.get();

      expect(prefs).toEqual(DEFAULT_PREFERENCES);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const storage1 = getPreferencesStorage();
      const storage2 = getPreferencesStorage();

      expect(storage1).toBe(storage2);
    });

    it('should create new instance after reset', () => {
      const storage1 = getPreferencesStorage();
      resetPreferencesStorage();
      const storage2 = getPreferencesStorage();

      expect(storage1).not.toBe(storage2);
    });
  });
});
