import { create } from 'zustand';
import { Preferences, ProcessingStats, ConstraintState, ProcessingStatus } from '../types';

interface PreferencesState {
  preferences: Preferences;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  setPreferences: (prefs: Partial<Preferences>) => void;
  resetPreferences: () => void;
}

const DEFAULT_PREFERENCES: Preferences = {
  aiMode: 'on-device',
  autoProcess: true,
  autoProcessNew: true,
  processNewPhotosOnly: true,
  processExisting: false,
  backgroundEnabled: true,
  backgroundProcessing: true,
  wifiOnly: true,
  wifiOnlyProcessing: true,
  chargingOnly: false,
  batteryThreshold: 20,
  overwriteExisting: false,
  metadataFormat: 'xmp',
  metadataFormats: ['xmp', 'exif', 'iptc'],
  highContrastMode: false,
  largeTextMode: false,
  reduceAnimations: false,
  hapticFeedback: true,
  voiceAnnouncements: true,
  autoSync: false,
  syncOnWifiOnly: true,
};

export const usePreferencesStore = create<PreferencesState>((set) => ({
  preferences: DEFAULT_PREFERENCES,
  setPreference: (key, value) =>
    set((state) => ({
      preferences: { ...state.preferences, [key]: value },
    })),
  setPreferences: (prefs) =>
    set((state) => ({
      preferences: { ...state.preferences, ...prefs },
    })),
  resetPreferences: () => set({ preferences: DEFAULT_PREFERENCES }),
}));

interface ProcessingState {
  stats: ProcessingStats;
  currentStatus: 'idle' | 'scanning' | 'processing' | 'paused';
  currentImageId: string | null;
  updateStats: (stats: Partial<ProcessingStats>) => void;
  updateProcessingStats: (stats: Partial<ProcessingStats>) => void;
  setStatus: (status: 'idle' | 'scanning' | 'processing' | 'paused') => void;
  setCurrentImage: (imageId: string | null) => void;
  incrementStat: (stat: keyof ProcessingStats, amount?: number) => void;
  decrementStat: (stat: keyof ProcessingStats, amount?: number) => void;
}

export const useProcessingStore = create<ProcessingState>((set) => ({
  stats: {
    total: 0,
    completed: 0,
    pending: 0,
    processing: 0,
    failed: 0,
    lastSyncAt: undefined,
  },
  currentStatus: 'idle',
  currentImageId: null,
  updateStats: (newStats) =>
    set((state) => ({
      stats: { ...state.stats, ...newStats },
    })),
  updateProcessingStats: (newStats) =>
    set((state) => ({
      stats: { ...state.stats, ...newStats },
    })),
  setStatus: (status) => set({ currentStatus: status }),
  setCurrentImage: (imageId) => set({ currentImageId: imageId }),
  incrementStat: (stat, amount = 1) =>
    set((state) => ({
      stats: { ...state.stats, [stat]: (state.stats[stat] ?? 0) + amount },
    })),
  decrementStat: (stat, amount = 1) =>
    set((state) => ({
      stats: { ...state.stats, [stat]: Math.max(0, (state.stats[stat] as number ?? 0) - amount) },
    })),
}));

interface ConstraintStoreState {
  constraints: ConstraintState;
  updateConstraints: (constraints: Partial<ConstraintState>) => void;
  canProcess: () => boolean;
}

export const useConstraintStore = create<ConstraintStoreState>((set, get) => ({
  constraints: {
    batteryLevel: 100,
    isCharging: false,
    isWifiConnected: false,
    thermalState: 'nominal',
    isLowPowerMode: false,
  },
  updateConstraints: (newConstraints) =>
    set((state) => ({
      constraints: { ...state.constraints, ...newConstraints },
    })),
  canProcess: () => {
    const { constraints } = get();
    const preferences = usePreferencesStore.getState().preferences;

    if (constraints.thermalState === 'critical') return false;
    if (constraints.isLowPowerMode) return false;
    if (constraints.batteryLevel < 20 && !constraints.isCharging) return false;
    if (preferences.wifiOnly && !constraints.isWifiConnected) return false;
    if (preferences.chargingOnly && !constraints.isCharging) return false;

    return true;
  },
}));

interface PermissionState {
  photoPermission: 'undetermined' | 'granted' | 'limited' | 'denied';
  backgroundPermission: 'undetermined' | 'granted' | 'denied';
  setPhotoPermission: (status: 'undetermined' | 'granted' | 'limited' | 'denied') => void;
  setBackgroundPermission: (status: 'undetermined' | 'granted' | 'denied') => void;
}

export const usePermissionStore = create<PermissionState>((set) => ({
  photoPermission: 'undetermined',
  backgroundPermission: 'undetermined',
  setPhotoPermission: (status) => set({ photoPermission: status }),
  setBackgroundPermission: (status) => set({ backgroundPermission: status }),
}));
