import { ProcessingStatus } from '../types';
import AiCaptionEngine, { CaptionResult, CaptionError } from './aiEngine';
import { writeCaption, WriteResult } from './metadataWriter';

export interface QueueItem {
  id: string;
  imageUri: string;
  assetId: string;
  priority: number;
  status: ProcessingStatus;
  addedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: CaptionResult;
  error?: CaptionError;
  retryCount: number;
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  averageProcessingTimeMs: number;
}

export interface QueueConfig {
  maxConcurrent: number;
  maxRetries: number;
  batchSize: number;
  priorityBoost: number;
}

export type QueueEventType = 'item-added' | 'item-started' | 'item-completed' | 'item-failed' | 'queue-empty' | 'queue-paused' | 'queue-resumed';

export interface QueueEvent {
  type: QueueEventType;
  item?: QueueItem;
  stats: QueueStats;
}

type QueueEventListener = (event: QueueEvent) => void;

const DEFAULT_CONFIG: QueueConfig = {
  maxConcurrent: 1,
  maxRetries: 2,
  batchSize: 10,
  priorityBoost: 10,
};

class ProcessingQueue {
  private queue: Map<string, QueueItem> = new Map();
  private processing: Set<string> = new Set();
  private config: QueueConfig;
  private engine: AiCaptionEngine;
  private isPaused = false;
  private isProcessing = false;
  private listeners: Set<QueueEventListener> = new Set();
  private processingTimes: number[] = [];

  constructor(engine: AiCaptionEngine, config: Partial<QueueConfig> = {}) {
    this.engine = engine;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  addItem(imageUri: string, assetId: string, priority = 0): QueueItem {
    const id = this.generateId();

    const item: QueueItem = {
      id,
      imageUri,
      assetId,
      priority,
      status: 'pending',
      addedAt: new Date(),
      retryCount: 0,
    };

    this.queue.set(id, item);
    this.emit({ type: 'item-added', item, stats: this.getStats() });

    if (!this.isPaused && !this.isProcessing) {
      this.processNext();
    }

    return item;
  }

  addBatch(items: Array<{ imageUri: string; assetId: string; priority?: number }>): QueueItem[] {
    return items.map(({ imageUri, assetId, priority }) =>
      this.addItem(imageUri, assetId, priority ?? 0)
    );
  }

  removeItem(id: string): boolean {
    const item = this.queue.get(id);
    if (!item) return false;

    if (this.processing.has(id)) {
      return false;
    }

    this.queue.delete(id);
    return true;
  }

  getItem(id: string): QueueItem | undefined {
    return this.queue.get(id);
  }

  getItemByAssetId(assetId: string): QueueItem | undefined {
    for (const item of this.queue.values()) {
      if (item.assetId === assetId) return item;
    }
    return undefined;
  }

  prioritize(id: string, boost = this.config.priorityBoost): void {
    const item = this.queue.get(id);
    if (item && item.status === 'pending') {
      item.priority += boost;
    }
  }

  pause(): void {
    this.isPaused = true;
    this.emit({ type: 'queue-paused', stats: this.getStats() });
  }

  resume(): void {
    this.isPaused = false;
    this.emit({ type: 'queue-resumed', stats: this.getStats() });

    if (!this.isProcessing) {
      this.processNext();
    }
  }

  clear(): void {
    const pendingItems = Array.from(this.queue.values()).filter(
      (item) => item.status === 'pending'
    );
    for (const item of pendingItems) {
      this.queue.delete(item.id);
    }
  }

  getStats(): QueueStats {
    const items = Array.from(this.queue.values());

    const pending = items.filter((i) => i.status === 'pending').length;
    const processing = items.filter((i) => i.status === 'processing').length;
    const completed = items.filter((i) => i.status === 'completed').length;
    const failed = items.filter((i) => i.status === 'failed').length;

    const avgTime =
      this.processingTimes.length > 0
        ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
        : 0;

    return {
      total: items.length,
      pending,
      processing,
      completed,
      failed,
      averageProcessingTimeMs: Math.round(avgTime),
    };
  }

  getQueue(): QueueItem[] {
    return Array.from(this.queue.values());
  }

  getPendingItems(): QueueItem[] {
    return this.getQueue()
      .filter((item) => item.status === 'pending')
      .sort((a, b) => b.priority - a.priority);
  }

  addEventListener(listener: QueueEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: QueueEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Queue event listener error:', error);
      }
    }
  }

  private async processNext(): Promise<void> {
    if (this.isPaused) return;

    const pending = this.getPendingItems();
    if (pending.length === 0) {
      this.isProcessing = false;
      this.emit({ type: 'queue-empty', stats: this.getStats() });
      return;
    }

    const availableSlots = this.config.maxConcurrent - this.processing.size;
    if (availableSlots <= 0) return;

    this.isProcessing = true;

    const toProcess = pending.slice(0, availableSlots);

    await Promise.all(toProcess.map((item) => this.processItem(item)));

    this.processNext();
  }

  private async processItem(item: QueueItem): Promise<void> {
    item.status = 'processing';
    item.startedAt = new Date();
    this.processing.add(item.id);
    this.emit({ type: 'item-started', item, stats: this.getStats() });

    try {
      const captionResult = await this.engine.generateCaption(item.imageUri);

      const writeResult = await writeCaption(item.imageUri, captionResult.caption);

      if (!writeResult.success) {
        throw new Error(writeResult.error ?? 'Failed to write caption');
      }

      item.status = 'completed';
      item.completedAt = new Date();
      item.result = captionResult;

      const processingTime = item.completedAt.getTime() - item.startedAt.getTime();
      this.processingTimes.push(processingTime);

      if (this.processingTimes.length > 100) {
        this.processingTimes.shift();
      }

      this.emit({ type: 'item-completed', item, stats: this.getStats() });
    } catch (error) {
      item.retryCount++;

      if (item.retryCount <= this.config.maxRetries && this.isRetryable(error)) {
        item.status = 'pending';
        item.priority -= 1;
      } else {
        item.status = 'failed';
        item.completedAt = new Date();
        item.error = this.toError(error);
        this.emit({ type: 'item-failed', item, stats: this.getStats() });
      }
    } finally {
      this.processing.delete(item.id);
    }
  }

  private isRetryable(error: unknown): boolean {
    if (error && typeof error === 'object' && 'recoverable' in error) {
      return (error as CaptionError).recoverable;
    }
    return false;
  }

  private toError(error: unknown): CaptionError {
    if (error && typeof error === 'object' && 'code' in error) {
      return error as CaptionError;
    }
    return {
      code: 'INFERENCE_FAILED',
      message: error instanceof Error ? error.message : 'Unknown error',
      recoverable: false,
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  dispose(): void {
    this.pause();
    this.queue.clear();
    this.processing.clear();
    this.listeners.clear();
    this.processingTimes.length = 0;
  }
}

export { ProcessingQueue };
export default ProcessingQueue;
