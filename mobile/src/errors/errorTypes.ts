export type ErrorCode =
  | 'PERMISSION_DENIED'
  | 'PERMISSION_LIMITED'
  | 'GALLERY_EMPTY'
  | 'GALLERY_ACCESS_FAILED'
  | 'IMAGE_NOT_FOUND'
  | 'IMAGE_CORRUPTED'
  | 'IMAGE_TOO_LARGE'
  | 'IMAGE_FORMAT_UNSUPPORTED'
  | 'METADATA_READ_FAILED'
  | 'METADATA_WRITE_FAILED'
  | 'METADATA_FORMAT_UNSUPPORTED'
  | 'AI_MODEL_LOAD_FAILED'
  | 'AI_INFERENCE_FAILED'
  | 'AI_TIMEOUT'
  | 'AI_QUOTA_EXCEEDED'
  | 'NETWORK_OFFLINE'
  | 'NETWORK_TIMEOUT'
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'API_RATE_LIMITED'
  | 'DATABASE_ERROR'
  | 'STORAGE_FULL'
  | 'BACKGROUND_TASK_FAILED'
  | 'SYNC_FAILED'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface MemoraError {
  code: ErrorCode;
  message: string;
  severity: ErrorSeverity;
  recoverable: boolean;
  userMessage: string;
  suggestion?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  stack?: string;
}

export interface ErrorContext {
  operation: string;
  imageId?: string;
  assetId?: string;
  uri?: string;
  additionalInfo?: Record<string, unknown>;
}

const ERROR_DEFINITIONS: Record<ErrorCode, {
  defaultMessage: string;
  severity: ErrorSeverity;
  recoverable: boolean;
  userMessage: string;
  suggestion?: string;
}> = {
  PERMISSION_DENIED: {
    defaultMessage: 'Photo library permission denied',
    severity: 'error',
    recoverable: true,
    userMessage: 'Memora needs access to your photos to generate captions.',
    suggestion: 'Open Settings and grant photo access to Memora.',
  },
  PERMISSION_LIMITED: {
    defaultMessage: 'Photo library permission is limited',
    severity: 'warning',
    recoverable: true,
    userMessage: 'Memora can only access selected photos.',
    suggestion: 'Open Settings to grant full photo library access.',
  },
  GALLERY_EMPTY: {
    defaultMessage: 'No photos found in gallery',
    severity: 'info',
    recoverable: false,
    userMessage: 'Your photo library is empty.',
    suggestion: 'Take some photos and come back later.',
  },
  GALLERY_ACCESS_FAILED: {
    defaultMessage: 'Failed to access photo gallery',
    severity: 'error',
    recoverable: true,
    userMessage: 'Unable to load your photos.',
    suggestion: 'Try again or restart the app.',
  },
  IMAGE_NOT_FOUND: {
    defaultMessage: 'Image not found',
    severity: 'warning',
    recoverable: false,
    userMessage: 'This image could not be found.',
    suggestion: 'The image may have been deleted.',
  },
  IMAGE_CORRUPTED: {
    defaultMessage: 'Image file is corrupted',
    severity: 'warning',
    recoverable: false,
    userMessage: 'This image cannot be processed.',
    suggestion: 'The image file may be damaged.',
  },
  IMAGE_TOO_LARGE: {
    defaultMessage: 'Image exceeds maximum size',
    severity: 'warning',
    recoverable: false,
    userMessage: 'This image is too large to process.',
    suggestion: 'Try processing a smaller image.',
  },
  IMAGE_FORMAT_UNSUPPORTED: {
    defaultMessage: 'Image format not supported',
    severity: 'warning',
    recoverable: false,
    userMessage: 'This image format is not supported.',
    suggestion: 'Memora supports JPEG, PNG, HEIC, and WebP.',
  },
  METADATA_READ_FAILED: {
    defaultMessage: 'Failed to read image metadata',
    severity: 'warning',
    recoverable: true,
    userMessage: 'Could not read image information.',
    suggestion: 'Try again later.',
  },
  METADATA_WRITE_FAILED: {
    defaultMessage: 'Failed to write image metadata',
    severity: 'error',
    recoverable: true,
    userMessage: 'Could not save caption to image.',
    suggestion: 'Make sure you have write permissions.',
  },
  METADATA_FORMAT_UNSUPPORTED: {
    defaultMessage: 'Metadata format not supported',
    severity: 'warning',
    recoverable: false,
    userMessage: 'This image type does not support captions.',
  },
  AI_MODEL_LOAD_FAILED: {
    defaultMessage: 'Failed to load AI model',
    severity: 'error',
    recoverable: true,
    userMessage: 'Could not start the caption generator.',
    suggestion: 'Try restarting the app.',
  },
  AI_INFERENCE_FAILED: {
    defaultMessage: 'AI caption generation failed',
    severity: 'error',
    recoverable: true,
    userMessage: 'Could not generate caption.',
    suggestion: 'Try again or use a different AI mode.',
  },
  AI_TIMEOUT: {
    defaultMessage: 'AI processing timed out',
    severity: 'warning',
    recoverable: true,
    userMessage: 'Caption generation took too long.',
    suggestion: 'Try again with a smaller image.',
  },
  AI_QUOTA_EXCEEDED: {
    defaultMessage: 'AI quota exceeded',
    severity: 'error',
    recoverable: false,
    userMessage: 'Daily caption limit reached.',
    suggestion: 'Try again tomorrow or switch to on-device mode.',
  },
  NETWORK_OFFLINE: {
    defaultMessage: 'Device is offline',
    severity: 'warning',
    recoverable: true,
    userMessage: 'No internet connection.',
    suggestion: 'Connect to the internet for cloud features.',
  },
  NETWORK_TIMEOUT: {
    defaultMessage: 'Network request timed out',
    severity: 'warning',
    recoverable: true,
    userMessage: 'Request timed out.',
    suggestion: 'Check your connection and try again.',
  },
  NETWORK_ERROR: {
    defaultMessage: 'Network error occurred',
    severity: 'error',
    recoverable: true,
    userMessage: 'Network error.',
    suggestion: 'Check your connection and try again.',
  },
  API_ERROR: {
    defaultMessage: 'API request failed',
    severity: 'error',
    recoverable: true,
    userMessage: 'Server error occurred.',
    suggestion: 'Try again later.',
  },
  API_RATE_LIMITED: {
    defaultMessage: 'API rate limit exceeded',
    severity: 'warning',
    recoverable: true,
    userMessage: 'Too many requests.',
    suggestion: 'Wait a moment and try again.',
  },
  DATABASE_ERROR: {
    defaultMessage: 'Database operation failed',
    severity: 'error',
    recoverable: true,
    userMessage: 'Could not save data.',
    suggestion: 'Try again or restart the app.',
  },
  STORAGE_FULL: {
    defaultMessage: 'Device storage is full',
    severity: 'critical',
    recoverable: false,
    userMessage: 'Your device is out of storage.',
    suggestion: 'Free up space and try again.',
  },
  BACKGROUND_TASK_FAILED: {
    defaultMessage: 'Background processing failed',
    severity: 'warning',
    recoverable: true,
    userMessage: 'Background processing stopped.',
    suggestion: 'Open the app to continue processing.',
  },
  SYNC_FAILED: {
    defaultMessage: 'Sync failed',
    severity: 'warning',
    recoverable: true,
    userMessage: 'Could not sync data.',
    suggestion: 'Check your connection and try again.',
  },
  VALIDATION_ERROR: {
    defaultMessage: 'Validation error',
    severity: 'warning',
    recoverable: true,
    userMessage: 'Invalid input.',
  },
  UNKNOWN_ERROR: {
    defaultMessage: 'An unexpected error occurred',
    severity: 'error',
    recoverable: true,
    userMessage: 'Something went wrong.',
    suggestion: 'Try again or restart the app.',
  },
};

export function createError(
  code: ErrorCode,
  context?: ErrorContext,
  originalError?: Error
): MemoraError {
  const definition = ERROR_DEFINITIONS[code];

  return {
    code,
    message: context?.operation
      ? `${definition.defaultMessage} during ${context.operation}`
      : definition.defaultMessage,
    severity: definition.severity,
    recoverable: definition.recoverable,
    userMessage: definition.userMessage,
    suggestion: definition.suggestion,
    metadata: {
      ...context?.additionalInfo,
      imageId: context?.imageId,
      assetId: context?.assetId,
      uri: context?.uri,
      operation: context?.operation,
    },
    timestamp: new Date(),
    stack: originalError?.stack,
  };
}

export function isRecoverable(error: MemoraError): boolean {
  return error.recoverable;
}

export function getErrorMessage(error: MemoraError, verbose = false): string {
  if (verbose && error.suggestion) {
    return `${error.userMessage} ${error.suggestion}`;
  }
  return error.userMessage;
}

export function mapErrorCode(error: Error): ErrorCode {
  const message = error.message.toLowerCase();

  if (message.includes('permission')) {
    return 'PERMISSION_DENIED';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'NETWORK_ERROR';
  }
  if (message.includes('timeout')) {
    return 'NETWORK_TIMEOUT';
  }
  if (message.includes('offline')) {
    return 'NETWORK_OFFLINE';
  }
  if (message.includes('quota') || message.includes('limit')) {
    return 'AI_QUOTA_EXCEEDED';
  }
  if (message.includes('model') || message.includes('load')) {
    return 'AI_MODEL_LOAD_FAILED';
  }
  if (message.includes('database') || message.includes('sqlite')) {
    return 'DATABASE_ERROR';
  }
  if (message.includes('storage') || message.includes('disk')) {
    return 'STORAGE_FULL';
  }

  return 'UNKNOWN_ERROR';
}

export function handleError(
  error: Error | MemoraError,
  context?: ErrorContext
): MemoraError {
  if ('code' in error && 'severity' in error) {
    return error as MemoraError;
  }

  const code = mapErrorCode(error as Error);
  return createError(code, context, error as Error);
}
