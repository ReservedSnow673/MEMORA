import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { usePreferencesStore, useProcessingStore } from '../store';

export interface SyncItem {
  id: string;
  assetId: string;
  imageUri: string;
  caption: string;
  captionSource: 'xmp' | 'exif' | 'iptc';
  aiModel: string;
  createdAt: Date;
  syncedAt?: Date;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  error?: string;
}

export interface SyncStats {
  totalPending: number;
  totalSynced: number;
  totalFailed: number;
  lastSyncAt: Date | null;
  lastError: string | null;
}

export interface SyncConfig {
  enabled: boolean;
  wifiOnly: boolean;
  batchSize: number;
  retryAttempts: number;
  retryDelayMs: number;
  serverUrl: string;
}

const DEFAULT_CONFIG: SyncConfig = {
  enabled: false,
  wifiOnly: true,
  batchSize: 20,
  retryAttempts: 3,
  retryDelayMs: 5000,
  serverUrl: '',
};

class SyncService {
  private config: SyncConfig;
  private queue: Map<string, SyncItem> = new Map();
  private isSyncing = false;
  private networkUnsubscribe: (() => void) | null = null;
  private stats: SyncStats = {
    totalPending: 0,
    totalSynced: 0,
    totalFailed: 0,
    lastSyncAt: null,
    lastError: null,
  };

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    this.networkUnsubscribe = NetInfo.addEventListener(
      this.handleNetworkChange.bind(this)
    );

    await this.loadPendingItems();
  }

  private async handleNetworkChange(state: NetInfoState): Promise<void> {
    if (!this.config.enabled) return;

    const canSync = this.canSyncWithNetwork(state);
    if (canSync && this.stats.totalPending > 0 && !this.isSyncing) {
      await this.sync();
    }
  }

  private canSyncWithNetwork(state: NetInfoState): boolean {
    if (!state.isConnected) return false;

    if (this.config.wifiOnly) {
      return state.type === 'wifi';
    }

    return true;
  }

  async addItem(item: Omit<SyncItem, 'id' | 'syncStatus' | 'createdAt'>): Promise<SyncItem> {
    const syncItem: SyncItem = {
      ...item,
      id: this.generateId(),
      syncStatus: 'pending',
      createdAt: new Date(),
    };

    this.queue.set(syncItem.id, syncItem);
    this.stats.totalPending++;

    await this.persistQueue();

    return syncItem;
  }

  async sync(): Promise<SyncStats> {
    if (!this.config.enabled || !this.config.serverUrl) {
      return this.stats;
    }

    if (this.isSyncing) {
      return this.stats;
    }

    const networkState = await NetInfo.fetch();
    if (!this.canSyncWithNetwork(networkState)) {
      return this.stats;
    }

    this.isSyncing = true;

    try {
      const pendingItems = this.getPendingItems();
      const batches = this.createBatches(pendingItems, this.config.batchSize);

      for (const batch of batches) {
        await this.syncBatch(batch);
      }

      this.stats.lastSyncAt = new Date();
      this.stats.lastError = null;
    } catch (error) {
      this.stats.lastError = error instanceof Error ? error.message : 'Sync failed';
    } finally {
      this.isSyncing = false;
    }

    return this.stats;
  }

  private async syncBatch(items: SyncItem[]): Promise<void> {
    for (const item of items) {
      item.syncStatus = 'syncing';
    }

    try {
      const response = await this.sendToServer(items);

      for (const item of items) {
        if (response.success) {
          item.syncStatus = 'synced';
          item.syncedAt = new Date();
          this.stats.totalPending--;
          this.stats.totalSynced++;
        } else {
          item.syncStatus = 'failed';
          item.error = response.error;
          this.stats.totalPending--;
          this.stats.totalFailed++;
        }
      }
    } catch (error) {
      for (const item of items) {
        item.syncStatus = 'failed';
        item.error = error instanceof Error ? error.message : 'Unknown error';
        this.stats.totalPending--;
        this.stats.totalFailed++;
      }
    }

    await this.persistQueue();
  }

  private async sendToServer(
    items: SyncItem[]
  ): Promise<{ success: boolean; error?: string }> {
    const payload = items.map((item) => ({
      assetId: item.assetId,
      caption: item.caption,
      captionSource: item.captionSource,
      aiModel: item.aiModel,
      createdAt: item.createdAt.toISOString(),
    }));

    const response = await fetch(`${this.config.serverUrl}/api/sync/captions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId: await this.getDeviceId(),
        captions: payload,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return { success: true };
  }

  private async getDeviceId(): Promise<string> {
    return 'device-placeholder';
  }

  getPendingItems(): SyncItem[] {
    return Array.from(this.queue.values()).filter(
      (item) => item.syncStatus === 'pending'
    );
  }

  getFailedItems(): SyncItem[] {
    return Array.from(this.queue.values()).filter(
      (item) => item.syncStatus === 'failed'
    );
  }

  getSyncedItems(): SyncItem[] {
    return Array.from(this.queue.values()).filter(
      (item) => item.syncStatus === 'synced'
    );
  }

  getStats(): SyncStats {
    return { ...this.stats };
  }

  async retryFailed(): Promise<void> {
    const failedItems = this.getFailedItems();
    for (const item of failedItems) {
      item.syncStatus = 'pending';
      item.error = undefined;
      this.stats.totalFailed--;
      this.stats.totalPending++;
    }

    await this.persistQueue();
    await this.sync();
  }

  async clearSynced(): Promise<void> {
    const syncedItems = this.getSyncedItems();
    for (const item of syncedItems) {
      this.queue.delete(item.id);
    }
    this.stats.totalSynced = 0;

    await this.persistQueue();
  }

  private createBatches<T>(items: T[], size: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      batches.push(items.slice(i, i + size));
    }
    return batches;
  }

  private async loadPendingItems(): Promise<void> {
  }

  private async persistQueue(): Promise<void> {
  }

  private generateId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  updateConfig(updates: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getConfig(): SyncConfig {
    return { ...this.config };
  }

  dispose(): void {
    this.networkUnsubscribe?.();
    this.queue.clear();
    this.isSyncing = false;
  }
}

let syncServiceInstance: SyncService | null = null;

export function getSyncService(): SyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService();
  }
  return syncServiceInstance;
}

export function resetSyncService(): void {
  syncServiceInstance?.dispose();
  syncServiceInstance = null;
}

export { SyncService };
export default SyncService;
