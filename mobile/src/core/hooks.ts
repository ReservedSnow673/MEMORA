import { useState, useEffect, useCallback, useRef } from 'react';
import { getApp, AppState, InitializationResult } from './App';
import { Preferences } from '../types';
import { getPreferencesStorage } from '../database';
import { QueueStats, ProcessingQueue } from '../services';
import { getScheduler } from '../services/backgroundScheduler';
import { MemoraError, getErrorReportingService } from '../errors';

export function useApp() {
  const [state, setState] = useState<AppState>(getApp().getState());
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    const app = getApp();
    return app.subscribe(setState);
  }, []);

  const initialize = useCallback(async (): Promise<InitializationResult> => {
    setIsInitializing(true);
    try {
      const app = getApp();
      return await app.initialize();
    } finally {
      setIsInitializing(false);
    }
  }, []);

  return {
    ...state,
    isInitializing,
    initialize,
    aiEngine: getApp().getAiEngine(),
  };
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const storage = getPreferencesStorage();
    
    storage.load()
      .then(setPreferences)
      .catch(setError)
      .finally(() => setIsLoading(false));

    return storage.subscribe(setPreferences);
  }, []);

  const updatePreferences = useCallback(async (updates: Partial<Preferences>) => {
    const storage = getPreferencesStorage();
    try {
      const updated = await storage.update(updates);
      setPreferences(updated);
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update preferences'));
      throw err;
    }
  }, []);

  const resetPreferences = useCallback(async () => {
    const storage = getPreferencesStorage();
    try {
      const reset = await storage.reset();
      setPreferences(reset);
      return reset;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to reset preferences'));
      throw err;
    }
  }, []);

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
    resetPreferences,
  };
}

export function useProcessingQueue() {
  const [stats, setStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    averageProcessingTimeMs: 0,
  });
  const [isRunning, setIsRunning] = useState(false);
  const queueRef = useRef<ProcessingQueue | null>(null);

  useEffect(() => {
    const scheduler = getScheduler();
    const state = scheduler.getState();
    setIsRunning(state.isRunning);
  }, []);

  const start = useCallback(async () => {
    const scheduler = getScheduler();
    await scheduler.start();
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    const scheduler = getScheduler();
    scheduler.stop();
    setIsRunning(false);
  }, []);

  return {
    stats,
    isRunning,
    start,
    pause,
  };
}

export function useErrors() {
  const [errors, setErrors] = useState<MemoraError[]>([]);
  const [latestError, setLatestError] = useState<MemoraError | null>(null);

  useEffect(() => {
    const service = getErrorReportingService();
    
    return service.subscribe((error) => {
      setLatestError(error);
      setErrors((prev) => [...prev, error]);
    });
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
    setLatestError(null);
  }, []);

  const dismissError = useCallback((index: number) => {
    setErrors((prev) => prev.filter((_, i) => i !== index));
    if (errors.length === 1) {
      setLatestError(null);
    }
  }, [errors.length]);

  return {
    errors,
    latestError,
    clearErrors,
    dismissError,
    hasErrors: errors.length > 0,
  };
}

export function useOnboarding() {
  const [isComplete, setIsComplete] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storage = getPreferencesStorage();
    storage.isOnboardingComplete()
      .then(setIsComplete)
      .finally(() => setIsLoading(false));
  }, []);

  const completeOnboarding = useCallback(async () => {
    const storage = getPreferencesStorage();
    await storage.setOnboardingComplete(true);
    setIsComplete(true);
  }, []);

  const resetOnboarding = useCallback(async () => {
    const storage = getPreferencesStorage();
    await storage.setOnboardingComplete(false);
    setIsComplete(false);
  }, []);

  return {
    isComplete,
    isLoading,
    completeOnboarding,
    resetOnboarding,
  };
}
