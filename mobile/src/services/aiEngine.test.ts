import AiCaptionEngine, { TFLiteEngine, GeminiEngine, OpenAIEngine } from '../aiEngine';

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
    });

    it('should initialize in cloud mode with API keys', async () => {
      const engine = new AiCaptionEngine({
        mode: 'cloud',
        geminiApiKey: 'test-key',
      });
      await engine.initialize();
      expect(engine).toBeDefined();
    });

    it('should initialize in hybrid mode', async () => {
      const engine = new AiCaptionEngine({
        mode: 'hybrid',
        geminiApiKey: 'test-key',
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
  });

  describe('dispose', () => {
    it('should dispose all engines and clear cache', async () => {
      const engine = new AiCaptionEngine({ mode: 'hybrid', geminiApiKey: 'key' });
      await engine.initialize();
      await engine.generateCaption('file:///test/image.jpg');

      engine.dispose();
    });
  });
});

describe('TFLiteEngine', () => {
  it('should initialize successfully', async () => {
    const engine = new TFLiteEngine();
    await engine.initialize();
    expect(engine.isAvailable()).toBe(true);
  });

  it('should generate caption', async () => {
    const engine = new TFLiteEngine();
    await engine.initialize();

    const result = await engine.generateCaption('file:///test.jpg');

    expect(result.caption).toBeDefined();
    expect(result.model).toBe('blip-base-tflite');
  });

  it('should throw if not initialized', async () => {
    const engine = new TFLiteEngine();
    await expect(engine.generateCaption('file:///test.jpg')).rejects.toThrow();
  });

  it('should dispose properly', async () => {
    const engine = new TFLiteEngine();
    await engine.initialize();
    engine.dispose();
    expect(engine.isAvailable()).toBe(false);
  });
});

describe('GeminiEngine', () => {
  it('should initialize with API key', async () => {
    const engine = new GeminiEngine('test-api-key');
    await engine.initialize();
    expect(engine.isAvailable()).toBe(true);
  });

  it('should not be available without API key', async () => {
    const engine = new GeminiEngine();
    await engine.initialize();
    expect(engine.isAvailable()).toBe(false);
  });

  it('should generate caption', async () => {
    const engine = new GeminiEngine('test-api-key');
    await engine.initialize();

    const result = await engine.generateCaption('file:///test.jpg');

    expect(result.caption).toBeDefined();
    expect(result.model).toBe('gemini-1.5-flash');
  });
});

describe('OpenAIEngine', () => {
  it('should initialize with API key', async () => {
    const engine = new OpenAIEngine('test-api-key');
    await engine.initialize();
    expect(engine.isAvailable()).toBe(true);
  });

  it('should not be available without API key', async () => {
    const engine = new OpenAIEngine();
    await engine.initialize();
    expect(engine.isAvailable()).toBe(false);
  });

  it('should generate caption with GPT-5.2', async () => {
    const engine = new OpenAIEngine('test-api-key');
    await engine.initialize();

    const result = await engine.generateCaption('file:///test.jpg');

    expect(result.caption).toBeDefined();
    expect(result.model).toBe('gpt-5.2');
    expect(result.confidence).toBeGreaterThan(0);
  });
});
