export type AiMode = 'on-device' | 'gemini' | 'gpt-5.2' | 'cloud' | 'hybrid';

export type MetadataFormat = 'xmp' | 'exif' | 'iptc';

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type PermissionStatus = 'undetermined' | 'granted' | 'denied' | 'limited';

export interface Preferences {
  // AI Settings
  aiMode: AiMode;
  
  // Processing Settings  
  autoProcess: boolean;
  autoProcessNew: boolean;
  processNewPhotosOnly: boolean;
  processExisting: boolean;
  backgroundEnabled: boolean;
  backgroundProcessing: boolean;
  wifiOnly: boolean;
  wifiOnlyProcessing: boolean;
  chargingOnly: boolean;
  batteryThreshold: number;
  overwriteExisting: boolean;
  
  // Metadata Settings
  metadataFormat: MetadataFormat;
  metadataFormats: MetadataFormat[];
  
  // Accessibility Settings
  highContrastMode: boolean;
  largeTextMode: boolean;
  reduceAnimations: boolean;
  hapticFeedback: boolean;
  voiceAnnouncements: boolean;
  
  // Sync Settings
  autoSync: boolean;
  syncOnWifiOnly: boolean;
}

export interface ProcessingQueueItem {
  id: string;
  assetId: string;
  assetUri: string;
  status: ProcessingStatus;
  caption: string | null;
  modelUsed: AiMode | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ProcessingStats {
  total: number;
  completed: number;
  pending: number;
  processing: number;
  failed: number;
  lastSyncAt?: number;
}

export interface ProcessingState {
  stats: ProcessingStats;
  isProcessing: boolean;
  currentItem?: ProcessingQueueItem;
  updateProcessingStats: (stats: Partial<ProcessingStats>) => void;
}

export interface ConstraintState {
  batteryLevel: number;
  isCharging: boolean;
  isWifiConnected: boolean;
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical';
  isLowPowerMode: boolean;
}

export interface CaptionResult {
  success: boolean;
  caption?: string;
  error?: string;
  modelUsed?: AiMode;
  processingTime?: number;
}

export interface MetadataInfo {
  hasCaption: boolean;
  caption?: string;
  source?: 'xmp' | 'exif' | 'iptc';
}

export interface ImageAsset {
  id: string;
  uri: string;
  filename: string;
  mediaType: string;
  width: number;
  height: number;
  creationTime: number;
  modificationTime: number;
}

export interface CaptionHistory {
  id: string;
  imageHash: string;
  caption: string;
  modelUsed: AiMode;
  wasManualEdit: boolean;
  createdAt: number;
}
