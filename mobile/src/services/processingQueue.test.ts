import ProcessingQueue from './processingQueue';
import AiCaptionEngine from './aiEngine';

jest.mock('./metadataWriter', () => ({
  writeCaption: jest.fn().mockResolvedValue({
    success: true,
    uri: '/test/output.jpg',
    formatsWritten: ['xmp'],
  }),
}));

describe('ProcessingQueue', () => {
  let engine: AiCaptionEngine;
  let queue: ProcessingQueue;

  beforeEach(async () => {
    engine = new AiCaptionEngine({ mode: 'on-device' });
    await engine.initialize();
    queue = new ProcessingQueue(engine);
  });

  afterEach(() => {
    queue.dispose();
    engine.dispose();
  });

  describe('addItem', () => {
    it('should add item to queue', () => {
      queue.pause(); // Pause to prevent auto-processing
      const item = queue.addItem('file:///test.jpg', 'asset-1');

      expect(item.id).toBeDefined();
      expect(item.imageUri).toBe('file:///test.jpg');
      expect(item.assetId).toBe('asset-1');
      expect(item.status).toBe('pending');
    });

    it('should add item with priority', () => {
      queue.pause(); // Pause to prevent auto-processing
      const item = queue.addItem('file:///test.jpg', 'asset-1', 10);

      expect(item.priority).toBe(10);
    });

    it('should emit item-added event', () => {
      const listener = jest.fn();
      queue.addEventListener(listener);

      queue.addItem('file:///test.jpg', 'asset-1');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'item-added' })
      );
    });
  });

  describe('addBatch', () => {
    it('should add multiple items', () => {
      const items = queue.addBatch([
        { imageUri: 'file:///1.jpg', assetId: 'a1' },
        { imageUri: 'file:///2.jpg', assetId: 'a2' },
        { imageUri: 'file:///3.jpg', assetId: 'a3' },
      ]);

      expect(items).toHaveLength(3);
      expect(queue.getStats().total).toBe(3);
    });
  });

  describe('removeItem', () => {
    it('should remove pending item', () => {
      queue.pause();
      const item = queue.addItem('file:///test.jpg', 'asset-1');

      const removed = queue.removeItem(item.id);

      expect(removed).toBe(true);
      expect(queue.getItem(item.id)).toBeUndefined();
    });

    it('should return false for non-existent item', () => {
      const removed = queue.removeItem('non-existent');

      expect(removed).toBe(false);
    });
  });

  describe('getItem', () => {
    it('should return item by id', () => {
      queue.pause();
      const added = queue.addItem('file:///test.jpg', 'asset-1');

      const item = queue.getItem(added.id);

      expect(item).toEqual(added);
    });
  });

  describe('getItemByAssetId', () => {
    it('should return item by asset id', () => {
      queue.pause();
      queue.addItem('file:///test.jpg', 'asset-123');

      const item = queue.getItemByAssetId('asset-123');

      expect(item).toBeDefined();
      expect(item?.assetId).toBe('asset-123');
    });

    it('should return undefined for non-existent asset', () => {
      const item = queue.getItemByAssetId('non-existent');

      expect(item).toBeUndefined();
    });
  });

  describe('prioritize', () => {
    it('should boost item priority', () => {
      queue.pause();
      const item = queue.addItem('file:///test.jpg', 'asset-1', 5);

      queue.prioritize(item.id, 20);

      expect(queue.getItem(item.id)?.priority).toBe(25);
    });
  });

  describe('pause and resume', () => {
    it('should pause processing', () => {
      queue.pause();
      queue.addItem('file:///test.jpg', 'asset-1');

      expect(queue.getStats().processing).toBe(0);
    });

    it('should emit queue-paused event', () => {
      const listener = jest.fn();
      queue.addEventListener(listener);

      queue.pause();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'queue-paused' })
      );
    });

    it('should emit queue-resumed event', () => {
      queue.pause();
      const listener = jest.fn();
      queue.addEventListener(listener);

      queue.resume();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'queue-resumed' })
      );
    });
  });

  describe('clear', () => {
    it('should remove pending items', () => {
      queue.pause();
      queue.addBatch([
        { imageUri: 'file:///1.jpg', assetId: 'a1' },
        { imageUri: 'file:///2.jpg', assetId: 'a2' },
      ]);

      queue.clear();

      expect(queue.getStats().pending).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct stats', () => {
      queue.pause();
      queue.addBatch([
        { imageUri: 'file:///1.jpg', assetId: 'a1' },
        { imageUri: 'file:///2.jpg', assetId: 'a2' },
      ]);

      const stats = queue.getStats();

      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(2);
      expect(stats.processing).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
    });
  });

  describe('getPendingItems', () => {
    it('should return items sorted by priority', () => {
      queue.pause();
      queue.addItem('file:///low.jpg', 'a1', 1);
      queue.addItem('file:///high.jpg', 'a2', 10);
      queue.addItem('file:///medium.jpg', 'a3', 5);

      const pending = queue.getPendingItems();

      expect(pending[0].priority).toBe(10);
      expect(pending[1].priority).toBe(5);
      expect(pending[2].priority).toBe(1);
    });
  });

  describe('event listeners', () => {
    it('should unsubscribe when unsubscribe function called', () => {
      const listener = jest.fn();
      const unsubscribe = queue.addEventListener(listener);

      unsubscribe();
      queue.pause();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should clear queue and listeners', () => {
      queue.pause();
      queue.addItem('file:///test.jpg', 'asset-1');
      const listener = jest.fn();
      queue.addEventListener(listener);

      queue.dispose();

      expect(queue.getStats().total).toBe(0);
    });
  });
});
