export interface Device {
  id: string;
  deviceId: string;
  platform: 'ios' | 'android';
  createdAt: Date;
  lastSyncAt: Date | null;
}

export interface ProcessingState {
  id: string;
  deviceId: string;
  imageHash: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  caption: string | null;
  modelUsed: 'on-device' | 'gemini' | 'gpt-5.2' | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CaptionHistory {
  id: string;
  deviceId: string;
  imageHash: string;
  caption: string;
  modelUsed: 'on-device' | 'gemini' | 'gpt-5.2';
  wasManualEdit: boolean;
  createdAt: Date;
}

export interface Preferences {
  deviceId: string;
  backgroundEnabled: boolean;
  aiMode: 'on-device' | 'gemini' | 'gpt-5.2';
  autoProcessNew: boolean;
  processExisting: boolean;
  wifiOnly: boolean;
  chargingOnly: boolean;
  updatedAt: Date;
}

export interface ErrorLog {
  id: string;
  deviceId: string;
  errorType: string;
  errorMessage: string | null;
  context: Record<string, unknown> | null;
  createdAt: Date;
}

export interface SyncPullRequest {
  deviceId: string;
  lastPulledAt: number;
}

export interface SyncPullResponse {
  changes: {
    processingState: {
      created: ProcessingState[];
      updated: ProcessingState[];
      deleted: string[];
    };
    captionHistory: {
      created: CaptionHistory[];
    };
  };
  timestamp: number;
}

export interface SyncPushRequest {
  deviceId: string;
  changes: {
    processingState: ProcessingState[];
    captionHistory: CaptionHistory[];
  };
}

export interface SyncPushResponse {
  success: boolean;
  conflicts: string[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
