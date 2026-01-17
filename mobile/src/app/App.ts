import { initializeDatabase, getDatabase } from '../database';
import { getPreferencesStorage } from '../database';
import { AiCaptionEngine } from '../services/aiEngine';
import { getScheduler } from '../services/backgroundScheduler';
import { getSyncService } from '../services/syncService';
import { getErrorReportingService } from '../errors';
import { checkPhotoPermission } from '../services/permissions';

export interface AppState {
  isInitialized: boolean;
  isLoading: boolean;
  hasPermission: boolean;
  permissionStatus: 'granted' | 'limited' | 'denied' | 'undetermined';
  error: Error | null;
}

export interface InitializationResult {
  success: boolean;
  error?: Error;
  permissionGranted: boolean;
}

class App {
  private state: AppState = {
    isInitialized: false,
    isLoading: false,
    hasPermission: false,
    permissionStatus: 'undetermined',
    error: null,
  };

  private aiEngine: AiCaptionEngine | null = null;
  private listeners: Set<(state: AppState) => void> = new Set();

  async initialize(): Promise<InitializationResult> {
    if (this.state.isInitialized) {
      return { success: true, permissionGranted: this.state.hasPermission };
    }

    this.updateState({ isLoading: true, error: null });

    try {
      await this.initializeDatabase();

      await this.loadPreferences();

      const permissionResult = await this.checkPermissions();

      await this.initializeAiEngine();

      await this.initializeBackgroundServices();

      this.updateState({
        isInitialized: true,
        isLoading: false,
        hasPermission: permissionResult.granted,
        permissionStatus: permissionResult.status,
      });

      return {
        success: true,
        permissionGranted: permissionResult.granted,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Initialization failed');
      
      this.updateState({
        isLoading: false,
        error: err,
      });

      getErrorReportingService().report(err, {
        context: 'App initialization',
      });

      return {
        success: false,
        error: err,
        permissionGranted: false,
      };
    }
  }

  private async initializeDatabase(): Promise<void> {
    await initializeDatabase();
  }

  private async loadPreferences(): Promise<void> {
    const storage = getPreferencesStorage();
    await storage.load();
  }

  private async checkPermissions(): Promise<{
    granted: boolean;
    status: AppState['permissionStatus'];
  }> {
    const result = await checkPhotoPermission();

    return {
      granted: result.granted,
      status: result.status as AppState['permissionStatus'],
    };
  }

  private async initializeAiEngine(): Promise<void> {
    const storage = getPreferencesStorage();
    const preferences = await storage.get();

    this.aiEngine = new AiCaptionEngine({
      mode: preferences.aiMode,
    });

    await this.aiEngine.initialize();
  }

  private async initializeBackgroundServices(): Promise<void> {
    if (!this.aiEngine) return;

    const scheduler = getScheduler();
    await scheduler.initialize(this.aiEngine);

    const syncService = getSyncService();
    await syncService.initialize();
  }

  getState(): AppState {
    return { ...this.state };
  }

  getAiEngine(): AiCaptionEngine | null {
    return this.aiEngine;
  }

  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private updateState(updates: Partial<AppState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (error) {
        console.error('App state listener error:', error);
      }
    }
  }

  async dispose(): Promise<void> {
    const scheduler = getScheduler();
    await scheduler.dispose();

    const syncService = getSyncService();
    syncService.dispose();

    this.aiEngine?.dispose();

    const db = getDatabase();
    await db.close();

    this.state = {
      isInitialized: false,
      isLoading: false,
      hasPermission: false,
      permissionStatus: 'undetermined',
      error: null,
    };

    this.listeners.clear();
  }
}

let appInstance: App | null = null;

export function getApp(): App {
  if (!appInstance) {
    appInstance = new App();
  }
  return appInstance;
}

export function resetApp(): void {
  appInstance?.dispose();
  appInstance = null;
}

export { App };
export default App;
