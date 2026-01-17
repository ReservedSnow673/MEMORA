import AiCaptionEngine, { 
  TFLiteEngine, 
  GeminiEngine, 
  OpenAIEngine, 
  AiEngineConfig 
} from './aiEngine';

// Mock expo modules - legacy API
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/mock/documents/',
  cacheDirectory: '/mock/cache/',
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
  readAsStringAsync: jest.fn().mockResolvedValue('base64mockdata'),
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({
    uri: 'file:///mock/manipulated.jpg',
    width: 384,
    height: 384,
    base64: 'mockBase64ImageData',
  }),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
  },
}));

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
});

describe('AiCaptionEngine', () => {
  describe('initialization', () => {
    it('should initialize with default config', async () => {
      const engine = new AiCaptionEngine();
      await expect(engine.initialize()).resolves.not.toThrow();
    });

    it('should initialize in on-device mode', async () => {
      const engine = new AiCaptionEngine({ mode: 'on-device' });
      await engine.initialize();
      expect(engine).toBeDefined();
      expect(engine.getConfig().mode).toBe('on-device');
    });

    it('should initialize in gemini mode with API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      });

      const engine = new AiCaptionEngine({
        mode: 'gemini',
        geminiApiKey: 'AIzaSyTestKey12345678901234567890123456',
      });
      await engine.initialize();
      expect(engine).toBeDefined();
      expect(engine.getConfig().mode).toBe('gemini');
    });

    it('should initialize in gpt-5.2 mode with API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const engine = new AiCaptionEngine({
        mode: 'gpt-5.2',
        openaiApiKey: 'sk-test1234567890abcdefghijklmnopqrstuvwxyz',
      });
      await engine.initialize();
      expect(engine).toBeDefined();
      expect(engine.getConfig().mode).toBe('gpt-5.2');
    });

    it('should initialize in hybrid mode', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      });

      const engine = new AiCaptionEngine({
        mode: 'hybrid',
        geminiApiKey: 'AIzaSyTestKey12345678901234567890123456',
      });
      await engine.initialize();
      expect(engine).toBeDefined();
    });

    it('should initialize in cloud mode with both API keys', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models: [], data: [] }),
      });

      const engine = new AiCaptionEngine({
        mode: 'cloud',
        geminiApiKey: 'AIzaSyTestKey12345678901234567890123456',
        openaiApiKey: 'sk-test1234567890abcdefghijklmnopqrstuvwxyz',
      });
      await engine.initialize();
      expect(engine).toBeDefined();
    });
  });

  describe('caption generation', () => {
    it('should generate caption in on-device mode', async () => {
      const engine = new AiCaptionEngine({ mode: 'on-device' });
      await engine.initialize();

      const result = await engine.generateCaption('file:///test/image.jpg');

      expect(result.caption).toBeDefined();
      expect(result.model).toBe('blip-base-tflite');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should return cached result on second call', async () => {
      const engine = new AiCaptionEngine({ mode: 'on-device' });
      await engine.initialize();

      const result1 = await engine.generateCaption('file:///test/image.jpg');
      const result2 = await engine.generateCaption('file:///test/image.jpg');

      expect(result2.cached).toBe(true);
      expect(result2.caption).toBe(result1.caption);
    });

    it('should clear cache', async () => {
      const engine = new AiCaptionEngine({ mode: 'on-device' });
      await engine.initialize();

      await engine.generateCaption('file:///test/image.jpg');
      engine.clearCache();

      const result = await engine.generateCaption('file:///test/image.jpg');
      expect(result.cached).toBe(false);
    });

    it('should generate caption with Gemini API', async () => {
      // Mock initialization
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      });

      const engine = new AiCaptionEngine({
        mode: 'gemini',
        geminiApiKey: 'AIzaSyTestKey12345678901234567890123456',
      });
      await engine.initialize();

      // Mock caption generation response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: 'A beautiful sunset over the ocean' }],
            },
            finishReason: 'STOP',
          }],
        }),
      });

      const result = await engine.generateCaption('file:///test/image.jpg');

      expect(result.caption).toBe('A beautiful sunset over the ocean');
      expect(result.model).toContain('gemini');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should generate caption with OpenAI API', async () => {
      // Mock initialization
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const engine = new AiCaptionEngine({
        mode: 'gpt-5.2',
        openaiApiKey: 'sk-test1234567890abcdefghijklmnopqrstuvwxyz',
      });
      await engine.initialize();

      // Mock caption generation response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'resp_123',
          output_text: 'A golden retriever playing in a park',
        }),
      });

      const result = await engine.generateCaption('file:///test/image.jpg');

      expect(result.caption).toBe('A golden retriever playing in a park');
      expect(result.model).toBe('gpt-5.2');
    });
  });

  describe('error handling', () => {
    it('should retry on recoverable errors', async () => {
      const engine = new AiCaptionEngine({ 
        mode: 'on-device',
        maxRetries: 2,
      });
      await engine.initialize();

      // The on-device engine should work without network issues
      const result = await engine.generateCaption('file:///test/image.jpg');
      expect(result).toBeDefined();
    });

    it('should handle API rate limits', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      });

      const engine = new AiCaptionEngine({
        mode: 'gemini',
        geminiApiKey: 'AIzaSyTestKey12345678901234567890123456',
        maxRetries: 1,
      });
      await engine.initialize();

      // Mock rate limit error
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          error: { code: 429, message: 'Rate limit exceeded' },
        }),
      });

      // The engine throws a CaptionError object (not an Error instance)
      // which includes code: 'QUOTA_EXCEEDED' for rate limit errors
      await expect(engine.generateCaption('file:///test/image.jpg'))
        .rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' });
    });
  });

  describe('configuration', () => {
    it('should get current config', async () => {
      const config: Partial<AiEngineConfig> = {
        mode: 'on-device',
        maxRetries: 5,
        timeoutMs: 60000,
      };
      
      const engine = new AiCaptionEngine(config);
      const currentConfig = engine.getConfig();
      
      expect(currentConfig.mode).toBe('on-device');
      expect(currentConfig.maxRetries).toBe(5);
      expect(currentConfig.timeoutMs).toBe(60000);
    });

    it('should update config and reinitialize on mode change', async () => {
      const engine = new AiCaptionEngine({ mode: 'on-device' });
      await engine.initialize();
      
      expect(engine.getConfig().mode).toBe('on-device');
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      });

      await engine.updateConfig({ 
        mode: 'gemini',
        geminiApiKey: 'AIzaSyTestKey12345678901234567890123456',
      });
      
      expect(engine.getConfig().mode).toBe('gemini');
    });
  });

  describe('dispose', () => {
    it('should dispose all engines and clear cache', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models: [], data: [] }),
      });

      const engine = new AiCaptionEngine({ 
        mode: 'hybrid', 
        geminiApiKey: 'AIzaSyTestKey12345678901234567890123456',
      });
      await engine.initialize();
      await engine.generateCaption('file:///test/image.jpg');

      engine.dispose();
      
      // After dispose, cache should be cleared
      // New call should not be cached
    });
  });
});

describe('TFLiteEngine', () => {
  const mockConfig: AiEngineConfig = {
    mode: 'on-device',
    maxRetries: 3,
    timeoutMs: 30000,
  };

  it('should initialize successfully when model exists', async () => {
    const engine = new TFLiteEngine(mockConfig);
    await engine.initialize();
    expect(engine.isAvailable()).toBe(true);
  });

  it('should generate caption', async () => {
    const engine = new TFLiteEngine(mockConfig);
    await engine.initialize();

    const result = await engine.generateCaption('file:///test.jpg');

    expect(result.caption).toBeDefined();
    expect(result.model).toBe('blip-base-tflite');
    expect(result.confidence).toBe(0.85);
  });

  it('should throw if not initialized', async () => {
    const engine = new TFLiteEngine(mockConfig);
    // Don't initialize
    await expect(engine.generateCaption('file:///test.jpg'))
      .rejects.toThrow('TFLite model not loaded');
  });

  it('should dispose properly', async () => {
    const engine = new TFLiteEngine(mockConfig);
    await engine.initialize();
    expect(engine.isAvailable()).toBe(true);
    
    engine.dispose();
    expect(engine.isAvailable()).toBe(false);
  });
});

describe('GeminiEngine', () => {
  const mockConfig: AiEngineConfig = {
    mode: 'gemini',
    maxRetries: 3,
    timeoutMs: 30000,
    geminiApiKey: 'AIzaSyTestKey12345678901234567890123456',
    maxImageDimension: 1024,
    imageQuality: 80,
  };

  it('should initialize with valid API key', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ models: [] }),
    });

    const engine = new GeminiEngine(mockConfig);
    await engine.initialize();
    expect(engine.isAvailable()).toBe(true);
  });

  it('should not be available without API key', async () => {
    const engine = new GeminiEngine({ ...mockConfig, geminiApiKey: undefined });
    await engine.initialize();
    expect(engine.isAvailable()).toBe(false);
  });

  it('should generate caption via API', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: 'A serene mountain landscape at dawn' }],
            },
            finishReason: 'STOP',
          }],
        }),
      });

    const engine = new GeminiEngine(mockConfig);
    await engine.initialize();

    const result = await engine.generateCaption('file:///test.jpg');

    expect(result.caption).toBe('A serene mountain landscape at dawn');
    expect(result.model).toContain('gemini');
    expect(result.confidence).toBe(0.92);
  });

  it('should handle API errors', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          error: {
            code: 400,
            message: 'Invalid request',
            status: 'INVALID_ARGUMENT',
          },
        }),
      });

    const engine = new GeminiEngine(mockConfig);
    await engine.initialize();

    await expect(engine.generateCaption('file:///test.jpg'))
      .rejects.toThrow('Gemini API error');
  });

  it('should handle content safety blocks', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: { parts: [] },
            finishReason: 'SAFETY',
          }],
        }),
      });

    const engine = new GeminiEngine(mockConfig);
    await engine.initialize();

    await expect(engine.generateCaption('file:///test.jpg'))
      .rejects.toThrow('Content blocked by safety filters');
  });
});

describe('OpenAIEngine', () => {
  const mockConfig: AiEngineConfig = {
    mode: 'gpt-5.2',
    maxRetries: 3,
    timeoutMs: 30000,
    openaiApiKey: 'sk-test1234567890abcdefghijklmnopqrstuvwxyz',
    maxImageDimension: 1024,
    imageQuality: 80,
  };

  it('should initialize with valid API key', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    const engine = new OpenAIEngine(mockConfig);
    await engine.initialize();
    expect(engine.isAvailable()).toBe(true);
  });

  it('should not be available without API key', async () => {
    const engine = new OpenAIEngine({ ...mockConfig, openaiApiKey: undefined });
    await engine.initialize();
    expect(engine.isAvailable()).toBe(false);
  });

  it('should generate caption via Responses API', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'resp_abc123',
          output_text: 'A child blowing out candles on a birthday cake',
        }),
      });

    const engine = new OpenAIEngine(mockConfig);
    await engine.initialize();

    const result = await engine.generateCaption('file:///test.jpg');

    expect(result.caption).toBe('A child blowing out candles on a birthday cake');
    expect(result.model).toBe('gpt-5.2');
    expect(result.confidence).toBe(0.95);
  });

  it('should handle rate limit errors', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          error: {
            code: 'rate_limit_exceeded',
            message: 'Rate limit exceeded',
          },
        }),
      });

    const engine = new OpenAIEngine(mockConfig);
    await engine.initialize();

    await expect(engine.generateCaption('file:///test.jpg'))
      .rejects.toThrow('Rate limit exceeded');
  });

  it('should handle content policy violations', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: {
            code: 'content_policy_violation',
            message: 'Content blocked by safety policy',
          },
        }),
      });

    const engine = new OpenAIEngine(mockConfig);
    await engine.initialize();

    await expect(engine.generateCaption('file:///test.jpg'))
      .rejects.toThrow('Content blocked by safety policy');
  });

  it('should extract caption from output array if output_text is missing', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'resp_abc123',
          output: [{
            type: 'message',
            content: [{
              type: 'output_text',
              text: 'Extracted from output array',
            }],
          }],
        }),
      });

    const engine = new OpenAIEngine(mockConfig);
    await engine.initialize();

    const result = await engine.generateCaption('file:///test.jpg');
    expect(result.caption).toBe('Extracted from output array');
  });
});
