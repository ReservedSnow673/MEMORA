import * as MediaLibrary from 'expo-media-library';
import {
  scanGallery,
  scanGalleryGenerator,
  getTotalAssetCount,
  getAssetsSince,
  getAssetById,
  isSupportedFormat,
} from './galleryScanner';

jest.mock('expo-media-library');

const mockMediaLibrary = MediaLibrary as jest.Mocked<typeof MediaLibrary>;

const createMockAsset = (id: string, creationTime: number): MediaLibrary.Asset => ({
  id,
  uri: `file://photos/${id}.jpg`,
  filename: `${id}.jpg`,
  mediaType: 'photo',
  width: 1920,
  height: 1080,
  creationTime,
  modificationTime: creationTime,
  duration: 0,
  albumId: 'album1',
});

describe('GalleryScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTotalAssetCount', () => {
    it('should return total count of photo assets', async () => {
      mockMediaLibrary.getAssetsAsync.mockResolvedValue({
        assets: [],
        endCursor: '',
        hasNextPage: false,
        totalCount: 500,
      });

      const count = await getTotalAssetCount();
      expect(count).toBe(500);
    });

    it('should return 0 for empty gallery', async () => {
      mockMediaLibrary.getAssetsAsync.mockResolvedValue({
        assets: [],
        endCursor: '',
        hasNextPage: false,
        totalCount: 0,
      });

      const count = await getTotalAssetCount();
      expect(count).toBe(0);
    });
  });

  describe('scanGallery', () => {
    it('should fetch all assets in batches', async () => {
      const batch1 = [createMockAsset('1', 1000), createMockAsset('2', 2000)];
      const batch2 = [createMockAsset('3', 3000)];

      mockMediaLibrary.getAssetsAsync
        .mockResolvedValueOnce({
          assets: [],
          endCursor: '',
          hasNextPage: false,
          totalCount: 3,
        })
        .mockResolvedValueOnce({
          assets: batch1,
          endCursor: 'cursor1',
          hasNextPage: true,
          totalCount: 3,
        })
        .mockResolvedValueOnce({
          assets: batch2,
          endCursor: 'cursor2',
          hasNextPage: false,
          totalCount: 3,
        });

      const assets = await scanGallery({ batchSize: 2 });
      expect(assets.length).toBe(3);
      expect(assets[0]?.id).toBe('1');
      expect(assets[2]?.id).toBe('3');
    });

    it('should report progress during scan', async () => {
      const batch = [createMockAsset('1', 1000)];
      
      mockMediaLibrary.getAssetsAsync
        .mockResolvedValueOnce({
          assets: [],
          endCursor: '',
          hasNextPage: false,
          totalCount: 1,
        })
        .mockResolvedValueOnce({
          assets: batch,
          endCursor: '',
          hasNextPage: false,
          totalCount: 1,
        });

      const onProgress = jest.fn();
      await scanGallery({ onProgress });

      expect(onProgress).toHaveBeenCalledWith({
        scanned: 1,
        total: 1,
        isComplete: true,
      });
    });

    it('should call onBatch callback for each batch', async () => {
      const batch1 = [createMockAsset('1', 1000)];
      const batch2 = [createMockAsset('2', 2000)];

      mockMediaLibrary.getAssetsAsync
        .mockResolvedValueOnce({
          assets: [],
          endCursor: '',
          hasNextPage: false,
          totalCount: 2,
        })
        .mockResolvedValueOnce({
          assets: batch1,
          endCursor: 'cursor1',
          hasNextPage: true,
          totalCount: 2,
        })
        .mockResolvedValueOnce({
          assets: batch2,
          endCursor: '',
          hasNextPage: false,
          totalCount: 2,
        });

      const onBatch = jest.fn();
      await scanGallery({ batchSize: 1, onBatch });

      expect(onBatch).toHaveBeenCalledTimes(2);
    });

    it('should handle abort signal', async () => {
      const controller = new AbortController();
      
      mockMediaLibrary.getAssetsAsync
        .mockResolvedValueOnce({
          assets: [],
          endCursor: '',
          hasNextPage: false,
          totalCount: 100,
        })
        .mockImplementation(async () => {
          controller.abort();
          return {
            assets: [createMockAsset('1', 1000)],
            endCursor: 'cursor1',
            hasNextPage: true,
            totalCount: 100,
          };
        });

      const assets = await scanGallery({ signal: controller.signal });
      expect(assets.length).toBeLessThan(100);
    });

    it('should handle empty gallery', async () => {
      mockMediaLibrary.getAssetsAsync.mockResolvedValue({
        assets: [],
        endCursor: '',
        hasNextPage: false,
        totalCount: 0,
      });

      const assets = await scanGallery();
      expect(assets).toEqual([]);
    });
  });

  describe('scanGalleryGenerator', () => {
    it('should yield batches of assets', async () => {
      const batch1 = [createMockAsset('1', 1000)];
      const batch2 = [createMockAsset('2', 2000)];

      mockMediaLibrary.getAssetsAsync
        .mockResolvedValueOnce({
          assets: batch1,
          endCursor: 'cursor1',
          hasNextPage: true,
          totalCount: 2,
        })
        .mockResolvedValueOnce({
          assets: batch2,
          endCursor: '',
          hasNextPage: false,
          totalCount: 2,
        });

      const batches: any[] = [];
      for await (const batch of scanGalleryGenerator({ batchSize: 1 })) {
        batches.push(batch);
      }

      expect(batches.length).toBe(2);
      expect(batches[0]?.[0]?.id).toBe('1');
      expect(batches[1]?.[0]?.id).toBe('2');
    });
  });

  describe('getAssetsSince', () => {
    it('should fetch assets created after timestamp', async () => {
      const recentAsset = createMockAsset('recent', 5000);

      mockMediaLibrary.getAssetsAsync.mockResolvedValue({
        assets: [recentAsset],
        endCursor: '',
        hasNextPage: false,
        totalCount: 1,
      });

      const assets = await getAssetsSince(3000);
      expect(assets.length).toBe(1);
      expect(assets[0]?.id).toBe('recent');

      expect(mockMediaLibrary.getAssetsAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAfter: 3000,
        })
      );
    });
  });

  describe('getAssetById', () => {
    it('should return asset info by id', async () => {
      const mockAsset = createMockAsset('test-id', 1000);
      mockMediaLibrary.getAssetInfoAsync.mockResolvedValue(mockAsset as any);

      const asset = await getAssetById('test-id');
      expect(asset?.id).toBe('test-id');
    });

    it('should return null for non-existent asset', async () => {
      mockMediaLibrary.getAssetInfoAsync.mockResolvedValue(null as any);

      const asset = await getAssetById('non-existent');
      expect(asset).toBeNull();
    });

    it('should return null on error', async () => {
      mockMediaLibrary.getAssetInfoAsync.mockRejectedValue(new Error('Asset not found'));

      const asset = await getAssetById('error-id');
      expect(asset).toBeNull();
    });
  });

  describe('isSupportedFormat', () => {
    it('should return true for JPEG', () => {
      expect(isSupportedFormat('photo.jpg')).toBe(true);
      expect(isSupportedFormat('photo.jpeg')).toBe(true);
    });

    it('should return true for PNG', () => {
      expect(isSupportedFormat('photo.png')).toBe(true);
    });

    it('should return true for HEIC', () => {
      expect(isSupportedFormat('photo.heic')).toBe(true);
      expect(isSupportedFormat('photo.heif')).toBe(true);
    });

    it('should return true for WebP', () => {
      expect(isSupportedFormat('photo.webp')).toBe(true);
    });

    it('should return false for unsupported formats', () => {
      expect(isSupportedFormat('video.mp4')).toBe(false);
      expect(isSupportedFormat('document.pdf')).toBe(false);
      expect(isSupportedFormat('raw.cr2')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isSupportedFormat('photo.JPG')).toBe(true);
      expect(isSupportedFormat('photo.PNG')).toBe(true);
    });
  });
});
