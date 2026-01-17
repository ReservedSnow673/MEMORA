import {
  createError,
  isRecoverable,
  getErrorMessage,
  mapErrorCode,
  handleError,
  ErrorCode,
  MemoraError,
} from '../errorTypes';

describe('errorTypes', () => {
  describe('createError', () => {
    it('should create error with code', () => {
      const error = createError('PERMISSION_DENIED');

      expect(error.code).toBe('PERMISSION_DENIED');
      expect(error.severity).toBe('error');
      expect(error.recoverable).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should include context in message', () => {
      const error = createError('AI_INFERENCE_FAILED', {
        operation: 'caption generation',
      });

      expect(error.message).toContain('caption generation');
    });

    it('should include metadata from context', () => {
      const error = createError('IMAGE_NOT_FOUND', {
        operation: 'read',
        imageId: 'img-123',
        assetId: 'asset-456',
        uri: 'file:///test.jpg',
      });

      expect(error.metadata?.imageId).toBe('img-123');
      expect(error.metadata?.assetId).toBe('asset-456');
      expect(error.metadata?.uri).toBe('file:///test.jpg');
    });

    it('should include stack trace from original error', () => {
      const originalError = new Error('Original error');
      const error = createError('UNKNOWN_ERROR', undefined, originalError);

      expect(error.stack).toBeDefined();
    });
  });

  describe('isRecoverable', () => {
    it('should return true for recoverable errors', () => {
      const error = createError('NETWORK_ERROR');
      expect(isRecoverable(error)).toBe(true);
    });

    it('should return false for non-recoverable errors', () => {
      const error = createError('IMAGE_CORRUPTED');
      expect(isRecoverable(error)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should return user message', () => {
      const error = createError('PERMISSION_DENIED');
      const message = getErrorMessage(error);

      expect(message).toBe('Memora needs access to your photos to generate captions.');
    });

    it('should include suggestion when verbose', () => {
      const error = createError('PERMISSION_DENIED');
      const message = getErrorMessage(error, true);

      expect(message).toContain('Settings');
    });
  });

  describe('mapErrorCode', () => {
    it('should map permission errors', () => {
      const error = new Error('Permission denied');
      expect(mapErrorCode(error)).toBe('PERMISSION_DENIED');
    });

    it('should map network errors', () => {
      const error = new Error('Network request failed');
      expect(mapErrorCode(error)).toBe('NETWORK_ERROR');
    });

    it('should map timeout errors', () => {
      const error = new Error('Request timeout');
      expect(mapErrorCode(error)).toBe('NETWORK_TIMEOUT');
    });

    it('should map offline errors', () => {
      const error = new Error('Device offline');
      expect(mapErrorCode(error)).toBe('NETWORK_OFFLINE');
    });

    it('should map quota errors', () => {
      const error = new Error('API quota exceeded');
      expect(mapErrorCode(error)).toBe('AI_QUOTA_EXCEEDED');
    });

    it('should map model errors', () => {
      const error = new Error('Failed to load model');
      expect(mapErrorCode(error)).toBe('AI_MODEL_LOAD_FAILED');
    });

    it('should map database errors', () => {
      const error = new Error('SQLite database error');
      expect(mapErrorCode(error)).toBe('DATABASE_ERROR');
    });

    it('should map storage errors', () => {
      const error = new Error('No storage space');
      expect(mapErrorCode(error)).toBe('STORAGE_FULL');
    });

    it('should return UNKNOWN_ERROR for unrecognized errors', () => {
      const error = new Error('Something weird happened');
      expect(mapErrorCode(error)).toBe('UNKNOWN_ERROR');
    });
  });

  describe('handleError', () => {
    it('should return MemoraError unchanged', () => {
      const memoraError = createError('API_ERROR');
      const handled = handleError(memoraError);

      expect(handled).toBe(memoraError);
    });

    it('should convert Error to MemoraError', () => {
      const error = new Error('Network failed');
      const handled = handleError(error);

      expect(handled.code).toBe('NETWORK_ERROR');
      expect(handled.severity).toBeDefined();
    });

    it('should include context', () => {
      const error = new Error('Something failed');
      const handled = handleError(error, {
        operation: 'test operation',
        imageId: 'img-123',
      });

      expect(handled.metadata?.operation).toBe('test operation');
      expect(handled.metadata?.imageId).toBe('img-123');
    });
  });

  describe('error definitions', () => {
    const allCodes: ErrorCode[] = [
      'PERMISSION_DENIED',
      'PERMISSION_LIMITED',
      'GALLERY_EMPTY',
      'GALLERY_ACCESS_FAILED',
      'IMAGE_NOT_FOUND',
      'IMAGE_CORRUPTED',
      'IMAGE_TOO_LARGE',
      'IMAGE_FORMAT_UNSUPPORTED',
      'METADATA_READ_FAILED',
      'METADATA_WRITE_FAILED',
      'METADATA_FORMAT_UNSUPPORTED',
      'AI_MODEL_LOAD_FAILED',
      'AI_INFERENCE_FAILED',
      'AI_TIMEOUT',
      'AI_QUOTA_EXCEEDED',
      'NETWORK_OFFLINE',
      'NETWORK_TIMEOUT',
      'NETWORK_ERROR',
      'API_ERROR',
      'API_RATE_LIMITED',
      'DATABASE_ERROR',
      'STORAGE_FULL',
      'BACKGROUND_TASK_FAILED',
      'SYNC_FAILED',
      'VALIDATION_ERROR',
      'UNKNOWN_ERROR',
    ];

    it.each(allCodes)('should have valid definition for %s', (code) => {
      const error = createError(code);

      expect(error.message).toBeDefined();
      expect(error.userMessage).toBeDefined();
      expect(error.severity).toMatch(/^(info|warning|error|critical)$/);
      expect(typeof error.recoverable).toBe('boolean');
    });
  });
});
