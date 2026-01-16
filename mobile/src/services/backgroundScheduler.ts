import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { AppState, AppStateStatus } from 'react-native';
import { getAssetsSince } from './galleryScanner';
import { checkImageHasCaption } from './metadataReader';
import { AiCaptionEngine } from './aiEngine';
import { ProcessingQueue } from './processingQueue';
import { usePreferencesStore, useProcessingStore } from '../store';

export const BACKGROUND_TASK_NAME = 'memora-background-caption';
export const BACKGROUND_FETCH_INTERVAL = 15 * 60;

export interface SchedulerConfig {
  enabled: boolean;
  processOnWifiOnly: boolean;
  processWhileCharging: boolean;
  maxDailyProcessing: number;
  respectBattery: boolean;
  lowBatteryThreshold: number;
}

export interface SchedulerState {
  isRunning: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  imagesProcessedToday: number;
  dailyResetAt: Date;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  enabled: true,
  processOnWifiOnly: true,
  processWhileCharging: false,
  maxDailyProcessing: 100,
  respectBattery: true,
  lowBatteryThreshold: 20,
};

class BackgroundScheduler {
  private config: SchedulerConfig;
  private state: SchedulerState;
  private engine: AiCaptionEngine | null = null;
  private queue: ProcessingQueue | null = null;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private isInitialized = false;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      isRunning: false,
      lastRunAt: null,
      nextRunAt: null,
      imagesProcessedToday: 0,
      dailyResetAt: this.getNextMidnight(),
    };
  }

  async initialize(engine: AiCaptionEngine): Promise<void> {
    if (this.isInitialized) return;

    this.engine = engine;
    this.queue = new ProcessingQueue(engine);

    await this.registerBackgroundTask();

    this.setupAppStateListener();

    this.isInitialized = true;
  }

  private async registerBackgroundTask(): Promise<void> {
    TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
      try {
        const result = await this.runBackgroundProcess();
        return result
          ? BackgroundFetch.BackgroundFetchResult.NewData
          : BackgroundFetch.BackgroundFetchResult.NoData;
      } catch (error) {
        console.error('Background task error:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    const status = await BackgroundFetch.getStatusAsync();

    if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
        minimumInterval: BACKGROUND_FETCH_INTERVAL,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  private handleAppStateChange(nextState: AppStateStatus): void {
    if (nextState === 'background') {
      this.onEnterBackground();
    } else if (nextState === 'active') {
      this.onEnterForeground();
    }
  }

  private async onEnterBackground(): Promise<void> {
    const prefs = usePreferencesStore.getState().preferences;
    if (prefs.backgroundProcessing) {
      this.queue?.resume();
    }
  }

  private async onEnterForeground(): Promise<void> {
    await this.checkNewImages();
  }

  async runBackgroundProcess(): Promise<boolean> {
    if (!this.canProcess()) {
      return false;
    }

    this.state.isRunning = true;
    this.state.lastRunAt = new Date();

    try {
      this.checkDailyReset();

      const lastSyncDate = this.getLastSyncDate();
      const newAssets = await getAssetsSince(lastSyncDate);

      let processedCount = 0;
      const maxToProcess = Math.min(
        this.config.maxDailyProcessing - this.state.imagesProcessedToday,
        10
      );

      for (const asset of newAssets) {
        if (processedCount >= maxToProcess) break;

        const captionInfo = await checkImageHasCaption(asset.uri);
        if (!captionInfo.hasCaption) {
          this.queue?.addItem(asset.uri, asset.id);
          processedCount++;
        }
      }

      this.state.imagesProcessedToday += processedCount;
      this.updateLastSyncDate();

      useProcessingStore.getState().updateProcessingStats({
        completed: useProcessingStore.getState().stats.completed + processedCount,
      });

      return processedCount > 0;
    } finally {
      this.state.isRunning = false;
      this.state.nextRunAt = new Date(Date.now() + BACKGROUND_FETCH_INTERVAL * 1000);
    }
  }

  async checkNewImages(): Promise<number> {
    const lastSyncDate = this.getLastSyncDate();
    const newAssets = await getAssetsSince(lastSyncDate);

    let uncaptionedCount = 0;

    for (const asset of newAssets.slice(0, 50)) {
      const captionInfo = await checkImageHasCaption(asset.uri);
      if (!captionInfo.hasCaption) {
        uncaptionedCount++;
      }
    }

    return uncaptionedCount;
  }

  private canProcess(): boolean {
    if (!this.config.enabled) return false;

    if (this.state.imagesProcessedToday >= this.config.maxDailyProcessing) {
      return false;
    }

    const prefs = usePreferencesStore.getState().preferences;
    if (!prefs.backgroundProcessing) return false;

    return true;
  }

  private checkDailyReset(): void {
    const now = new Date();
    if (now >= this.state.dailyResetAt) {
      this.state.imagesProcessedToday = 0;
      this.state.dailyResetAt = this.getNextMidnight();
    }
  }

  private getNextMidnight(): Date {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    return midnight;
  }

  private getLastSyncDate(): number {
    const stats = useProcessingStore.getState().stats;
    return stats.lastSyncAt ?? 0;
  }

  private updateLastSyncDate(): void {
    useProcessingStore.getState().updateProcessingStats({
      lastSyncAt: Date.now(),
    });
  }

  async start(): Promise<void> {
    this.config.enabled = true;
    await this.runBackgroundProcess();
  }

  stop(): void {
    this.config.enabled = false;
    this.queue?.pause();
  }

  getState(): SchedulerState {
    return { ...this.state };
  }

  getConfig(): SchedulerConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  async dispose(): Promise<void> {
    this.appStateSubscription?.remove();

    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASK_NAME);
    } catch {
    }

    this.queue?.dispose();
    this.engine = null;
    this.isInitialized = false;
  }
}

let schedulerInstance: BackgroundScheduler | null = null;

export function getScheduler(): BackgroundScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new BackgroundScheduler();
  }
  return schedulerInstance;
}

export function resetScheduler(): void {
  schedulerInstance?.dispose();
  schedulerInstance = null;
}

export { BackgroundScheduler };
export default BackgroundScheduler;
