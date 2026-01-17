export {
  checkPhotoPermission,
  requestPhotoPermission,
  canAccessPhotos,
} from './permissions';

export type {
  PhotoPermissionStatus,
  BackgroundPermissionStatus,
} from './permissions';

export {
  scanGallery,
  scanGalleryGenerator,
  getAssetsSince,
  getAssetById,
  isSupportedFormat,
} from './galleryScanner';

export type { ScanOptions, ScanProgress, ScanResult } from './galleryScanner';

export {
  readMetadata,
  readMetadataFromBase64,
  parseMetadataFromBytes,
  getCaptionInfo,
  checkImageHasCaption,
  isGenericCaption,
  detectCaptionQuality,
} from './metadataReader';

export type { FullMetadata } from './metadataReader';

export {
  writeCaption,
  removeCaption,
  copyCaption,
  validateCaption,
  sanitizeCaption,
} from './metadataWriter';

export type { MetadataFormat, WriteOptions, WriteResult } from './metadataWriter';

export {
  AiCaptionEngine,
  TFLiteEngine,
  GeminiEngine,
  OpenAIEngine,
} from './aiEngine';

export type {
  CaptionResult,
  CaptionError,
  AiEngineConfig,
  InferenceEngine,
} from './aiEngine';

export { ProcessingQueue } from './processingQueue';

export type {
  QueueItem,
  QueueStats,
  QueueConfig,
  QueueEventType,
  QueueEvent,
} from './processingQueue';
