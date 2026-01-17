export type AiMode = 'on-device' | 'gemini' | 'gpt-5.2';

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Preferences {
  backgroundEnabled: boolean;
  aiMode: AiMode;
  autoProcessNew: boolean;
  processExisting: boolean;
  wifiOnly: boolean;
  chargingOnly: boolean;
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
