import * as MediaLibrary from 'expo-media-library';
import { ImageAsset } from '../types';

export interface ScanProgress {
  scanned: number;
  total: number;
  isComplete: boolean;
}

export interface ScanOptions {
  batchSize?: number;
  mediaType?: MediaLibrary.MediaTypeValue[];
  onProgress?: (progress: ScanProgress) => void;
  onBatch?: (assets: ImageAsset[]) => Promise<void>;
  signal?: AbortSignal;
}

const DEFAULT_BATCH_SIZE = 100;
const SUPPORTED_MEDIA_TYPES: MediaLibrary.MediaTypeValue[] = ['photo'];

function mapAsset(asset: MediaLibrary.Asset): ImageAsset {
  return {
    id: asset.id,
    uri: asset.uri,
    filename: asset.filename,
    mediaType: asset.mediaType,
    width: asset.width,
    height: asset.height,
    creationTime: asset.creationTime,
    modificationTime: asset.modificationTime,
  };
}

export async function getTotalAssetCount(): Promise<number> {
  const { totalCount } = await MediaLibrary.getAssetsAsync({
    first: 1,
    mediaType: SUPPORTED_MEDIA_TYPES,
  });
  return totalCount;
}

export async function* scanGalleryGenerator(
  options: ScanOptions = {}
): AsyncGenerator<ImageAsset[], void, unknown> {
  const { batchSize = DEFAULT_BATCH_SIZE, signal } = options;

  let hasMore = true;
  let cursor: string | undefined;

  while (hasMore) {
    if (signal?.aborted) {
      return;
    }

    const result = await MediaLibrary.getAssetsAsync({
      first: batchSize,
      after: cursor,
      mediaType: SUPPORTED_MEDIA_TYPES,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });

    const assets = result.assets.map(mapAsset);
    yield assets;

    hasMore = result.hasNextPage;
    cursor = result.endCursor;
  }
}

export async function scanGallery(options: ScanOptions = {}): Promise<ImageAsset[]> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    onProgress,
    onBatch,
    signal,
  } = options;

  const allAssets: ImageAsset[] = [];
  const totalCount = await getTotalAssetCount();

  for await (const batch of scanGalleryGenerator({ batchSize, signal })) {
    if (signal?.aborted) {
      break;
    }

    allAssets.push(...batch);

    if (onBatch) {
      await onBatch(batch);
    }

    if (onProgress) {
      onProgress({
        scanned: allAssets.length,
        total: totalCount,
        isComplete: allAssets.length >= totalCount,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return allAssets;
}

export async function getAssetsSince(
  timestamp: number,
  options: ScanOptions = {}
): Promise<ImageAsset[]> {
  const { batchSize = DEFAULT_BATCH_SIZE, signal } = options;

  const allAssets: ImageAsset[] = [];
  let hasMore = true;
  let cursor: string | undefined;

  while (hasMore) {
    if (signal?.aborted) {
      break;
    }

    const result = await MediaLibrary.getAssetsAsync({
      first: batchSize,
      after: cursor,
      mediaType: SUPPORTED_MEDIA_TYPES,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      createdAfter: timestamp,
    });

    const assets = result.assets.map(mapAsset);
    allAssets.push(...assets);

    hasMore = result.hasNextPage;
    cursor = result.endCursor;

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return allAssets;
}

export async function getAssetById(assetId: string): Promise<ImageAsset | null> {
  try {
    const asset = await MediaLibrary.getAssetInfoAsync(assetId);
    if (!asset) {
      return null;
    }
    return mapAsset(asset);
  } catch {
    return null;
  }
}

export async function getAssetLocalUri(assetId: string): Promise<string | null> {
  try {
    const asset = await MediaLibrary.getAssetInfoAsync(assetId);
    return asset?.localUri ?? asset?.uri ?? null;
  } catch {
    return null;
  }
}

export function isImageAsset(asset: MediaLibrary.Asset): boolean {
  return asset.mediaType === 'photo';
}

export function isSupportedFormat(filename: string): boolean {
  const extension = filename.toLowerCase().split('.').pop();
  const supportedExtensions = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'];
  return supportedExtensions.includes(extension ?? '');
}
