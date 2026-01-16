import {
  usePreferencesStore,
  useProcessingStore,
  useConstraintStore,
  usePermissionStore,
} from './index';

describe('PreferencesStore', () => {
  beforeEach(() => {
    usePreferencesStore.getState().resetPreferences();
  });

  it('should have default preferences', () => {
    const { preferences } = usePreferencesStore.getState();
    expect(preferences.backgroundEnabled).toBe(true);
    expect(preferences.aiMode).toBe('on-device');
    expect(preferences.autoProcessNew).toBe(true);
    expect(preferences.processExisting).toBe(false);
    expect(preferences.wifiOnly).toBe(true);
    expect(preferences.chargingOnly).toBe(false);
  });

  it('should update single preference', () => {
    usePreferencesStore.getState().setPreference('aiMode', 'gemini');
    const { preferences } = usePreferencesStore.getState();
    expect(preferences.aiMode).toBe('gemini');
  });

  it('should update multiple preferences', () => {
    usePreferencesStore.getState().setPreferences({
      backgroundEnabled: false,
      wifiOnly: false,
    });
    const { preferences } = usePreferencesStore.getState();
    expect(preferences.backgroundEnabled).toBe(false);
    expect(preferences.wifiOnly).toBe(false);
    expect(preferences.aiMode).toBe('on-device');
  });

  it('should reset preferences to defaults', () => {
    usePreferencesStore.getState().setPreference('aiMode', 'gpt-5.2');
    usePreferencesStore.getState().resetPreferences();
    const { preferences } = usePreferencesStore.getState();
    expect(preferences.aiMode).toBe('on-device');
  });
});

describe('ProcessingStore', () => {
  beforeEach(() => {
    useProcessingStore.setState({
      stats: { total: 0, completed: 0, pending: 0, processing: 0, failed: 0 },
      currentStatus: 'idle',
      currentImageId: null,
    });
  });

  it('should have initial stats at zero', () => {
    const { stats } = useProcessingStore.getState();
    expect(stats.total).toBe(0);
    expect(stats.completed).toBe(0);
    expect(stats.pending).toBe(0);
    expect(stats.failed).toBe(0);
  });

  it('should update stats', () => {
    useProcessingStore.getState().updateStats({ total: 100, pending: 100 });
    const { stats } = useProcessingStore.getState();
    expect(stats.total).toBe(100);
    expect(stats.pending).toBe(100);
  });

  it('should set current status', () => {
    useProcessingStore.getState().setStatus('processing');
    expect(useProcessingStore.getState().currentStatus).toBe('processing');
  });

  it('should increment stat', () => {
    useProcessingStore.getState().updateStats({ completed: 5 });
    useProcessingStore.getState().incrementStat('completed', 3);
    expect(useProcessingStore.getState().stats.completed).toBe(8);
  });

  it('should decrement stat without going negative', () => {
    useProcessingStore.getState().updateStats({ pending: 2 });
    useProcessingStore.getState().decrementStat('pending', 5);
    expect(useProcessingStore.getState().stats.pending).toBe(0);
  });
});

describe('ConstraintStore', () => {
  beforeEach(() => {
    useConstraintStore.setState({
      constraints: {
        batteryLevel: 100,
        isCharging: false,
        isWifiConnected: true,
        thermalState: 'nominal',
        isLowPowerMode: false,
      },
    });
    usePreferencesStore.getState().resetPreferences();
  });

  it('should allow processing with good constraints', () => {
    expect(useConstraintStore.getState().canProcess()).toBe(true);
  });

  it('should block processing on critical thermal state', () => {
    useConstraintStore.getState().updateConstraints({ thermalState: 'critical' });
    expect(useConstraintStore.getState().canProcess()).toBe(false);
  });

  it('should block processing on low power mode', () => {
    useConstraintStore.getState().updateConstraints({ isLowPowerMode: true });
    expect(useConstraintStore.getState().canProcess()).toBe(false);
  });

  it('should block processing on low battery when not charging', () => {
    useConstraintStore.getState().updateConstraints({
      batteryLevel: 15,
      isCharging: false,
    });
    expect(useConstraintStore.getState().canProcess()).toBe(false);
  });

  it('should allow processing on low battery when charging', () => {
    useConstraintStore.getState().updateConstraints({
      batteryLevel: 15,
      isCharging: true,
    });
    expect(useConstraintStore.getState().canProcess()).toBe(true);
  });

  it('should block processing without wifi when wifi-only enabled', () => {
    usePreferencesStore.getState().setPreference('wifiOnly', true);
    useConstraintStore.getState().updateConstraints({ isWifiConnected: false });
    expect(useConstraintStore.getState().canProcess()).toBe(false);
  });

  it('should block processing when not charging and charging-only enabled', () => {
    usePreferencesStore.getState().setPreference('chargingOnly', true);
    useConstraintStore.getState().updateConstraints({ isCharging: false });
    expect(useConstraintStore.getState().canProcess()).toBe(false);
  });
});

describe('PermissionStore', () => {
  beforeEach(() => {
    usePermissionStore.setState({
      photoPermission: 'undetermined',
      backgroundPermission: 'undetermined',
    });
  });

  it('should have undetermined permissions initially', () => {
    const state = usePermissionStore.getState();
    expect(state.photoPermission).toBe('undetermined');
    expect(state.backgroundPermission).toBe('undetermined');
  });

  it('should update photo permission', () => {
    usePermissionStore.getState().setPhotoPermission('granted');
    expect(usePermissionStore.getState().photoPermission).toBe('granted');
  });

  it('should update background permission', () => {
    usePermissionStore.getState().setBackgroundPermission('denied');
    expect(usePermissionStore.getState().backgroundPermission).toBe('denied');
  });
});
