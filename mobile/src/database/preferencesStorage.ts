import AsyncStorage from '@react-native-async-storage/async-storage';
import { Preferences, AiMode, MetadataFormat } from '../types';

const PREFERENCES_KEY = 'memora_preferences';
const ONBOARDING_KEY = 'memora_onboarding_complete';
const LAST_SYNC_KEY = 'memora_last_sync';
const DEVICE_ID_KEY = 'memora_device_id';

export const DEFAULT_PREFERENCES: Preferences = {
  aiMode: 'on-device',
  autoProcess: true,
  processNewPhotosOnly: true,
  backgroundProcessing: true,
  wifiOnlyProcessing: true,
  batteryThreshold: 20,
  metadataFormats: ['xmp', 'exif', 'iptc'],
  overwriteExisting: false,
  highContrastMode: false,
  largeTextMode: false,
  reduceAnimations: false,
  hapticFeedback: true,
  voiceAnnouncements: true,
  autoSync: false,
  syncOnWifiOnly: true,
};

class PreferencesStorage {
  private cache: Preferences | null = null;
  private listeners: Set<(prefs: Preferences) => void> = new Set();

  async load(): Promise<Preferences> {
    try {
      const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.cache = { ...DEFAULT_PREFERENCES, ...parsed };
      } else {
        this.cache = { ...DEFAULT_PREFERENCES };
      }
      return this.cache;
    } catch (error) {
      console.error('Failed to load preferences:', error);
      this.cache = { ...DEFAULT_PREFERENCES };
      return this.cache;
    }
  }

  async save(preferences: Preferences): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
      this.cache = preferences;
      this.notifyListeners(preferences);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      throw error;
    }
  }

  async update(updates: Partial<Preferences>): Promise<Preferences> {
    const current = await this.get();
    const updated = { ...current, ...updates };
    await this.save(updated);
    return updated;
  }

  async get(): Promise<Preferences> {
    if (this.cache) {
      return this.cache;
    }
    return this.load();
  }

  async reset(): Promise<Preferences> {
    await this.save({ ...DEFAULT_PREFERENCES });
    return DEFAULT_PREFERENCES;
  }

  subscribe(listener: (prefs: Preferences) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(prefs: Preferences): void {
    for (const listener of this.listeners) {
      try {
        listener(prefs);
      } catch (error) {
        console.error('Preferences listener error:', error);
      }
    }
  }

  async isOnboardingComplete(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      return value === 'true';
    } catch {
      return false;
    }
  }

  async setOnboardingComplete(complete: boolean): Promise<void> {
    await AsyncStorage.setItem(ONBOARDING_KEY, complete ? 'true' : 'false');
  }

  async getLastSyncTime(): Promise<Date | null> {
    try {
      const value = await AsyncStorage.getItem(LAST_SYNC_KEY);
      return value ? new Date(parseInt(value, 10)) : null;
    } catch {
      return null;
    }
  }

  async setLastSyncTime(date: Date): Promise<void> {
    await AsyncStorage.setItem(LAST_SYNC_KEY, date.getTime().toString());
  }

  async getDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = this.generateDeviceId();
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      }
      return deviceId;
    } catch {
      return this.generateDeviceId();
    }
  }

  private generateDeviceId(): string {
    return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([
      PREFERENCES_KEY,
      ONBOARDING_KEY,
      LAST_SYNC_KEY,
    ]);
    this.cache = null;
    this.listeners.clear();
  }
}

let storageInstance: PreferencesStorage | null = null;

export function getPreferencesStorage(): PreferencesStorage {
  if (!storageInstance) {
    storageInstance = new PreferencesStorage();
  }
  return storageInstance;
}

export function resetPreferencesStorage(): void {
  storageInstance = null;
}

export { PreferencesStorage };
export default PreferencesStorage;
