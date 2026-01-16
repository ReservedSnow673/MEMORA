import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useApp, usePreferences, useProcessingQueue, useErrors, useOnboarding } from './hooks';

jest.mock('./App', () => ({
  getApp: jest.fn().mockReturnValue({
    getState: jest.fn().mockReturnValue({
      isInitialized: false,
      isLoading: false,
      hasPermission: false,
      permissionStatus: 'undetermined',
      error: null,
    }),
    subscribe: jest.fn().mockReturnValue(() => {}),
    initialize: jest.fn().mockResolvedValue({ success: true, permissionGranted: true }),
    getAiEngine: jest.fn().mockReturnValue(null),
  }),
}));

jest.mock('../database', () => ({
  getPreferencesStorage: jest.fn().mockReturnValue({
    load: jest.fn().mockResolvedValue({
      aiMode: 'on-device',
      autoProcess: true,
    }),
    subscribe: jest.fn().mockReturnValue(() => {}),
    update: jest.fn().mockImplementation((updates: any) => 
      Promise.resolve({ aiMode: 'on-device', autoProcess: true, ...updates })
    ),
    reset: jest.fn().mockResolvedValue({ aiMode: 'on-device', autoProcess: true }),
    isOnboardingComplete: jest.fn().mockResolvedValue(false),
    setOnboardingComplete: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../services/backgroundScheduler', () => ({
  getScheduler: jest.fn().mockReturnValue({
    getState: jest.fn().mockReturnValue({ isRunning: false }),
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
  }),
}));

jest.mock('../errors', () => ({
  getErrorReportingService: jest.fn().mockReturnValue({
    subscribe: jest.fn().mockReturnValue(() => {}),
  }),
}));

describe('useApp', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useApp());

    expect(result.current.isInitialized).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should have initialize function', () => {
    const { result } = renderHook(() => useApp());

    expect(typeof result.current.initialize).toBe('function');
  });
});

describe('usePreferences', () => {
  it('should load preferences', async () => {
    const { result } = renderHook(() => usePreferences());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.preferences).toBeDefined();
  });

  it('should have update function', () => {
    const { result } = renderHook(() => usePreferences());

    expect(typeof result.current.updatePreferences).toBe('function');
  });

  it('should have reset function', () => {
    const { result } = renderHook(() => usePreferences());

    expect(typeof result.current.resetPreferences).toBe('function');
  });
});

describe('useProcessingQueue', () => {
  it('should return initial stats', () => {
    const { result } = renderHook(() => useProcessingQueue());

    expect(result.current.stats).toBeDefined();
    expect(result.current.stats.total).toBe(0);
  });

  it('should have start function', () => {
    const { result } = renderHook(() => useProcessingQueue());

    expect(typeof result.current.start).toBe('function');
  });

  it('should have pause function', () => {
    const { result } = renderHook(() => useProcessingQueue());

    expect(typeof result.current.pause).toBe('function');
  });
});

describe('useErrors', () => {
  it('should return empty errors initially', () => {
    const { result } = renderHook(() => useErrors());

    expect(result.current.errors).toHaveLength(0);
    expect(result.current.hasErrors).toBe(false);
  });

  it('should have clearErrors function', () => {
    const { result } = renderHook(() => useErrors());

    expect(typeof result.current.clearErrors).toBe('function');
  });

  it('should have dismissError function', () => {
    const { result } = renderHook(() => useErrors());

    expect(typeof result.current.dismissError).toBe('function');
  });
});

describe('useOnboarding', () => {
  it('should check onboarding status', async () => {
    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isComplete).toBe(false);
  });

  it('should have completeOnboarding function', () => {
    const { result } = renderHook(() => useOnboarding());

    expect(typeof result.current.completeOnboarding).toBe('function');
  });

  it('should have resetOnboarding function', () => {
    const { result } = renderHook(() => useOnboarding());

    expect(typeof result.current.resetOnboarding).toBe('function');
  });
});
