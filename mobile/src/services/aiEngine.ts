import { AiMode } from '../types';

export interface CaptionResult {
  caption: string;
  confidence: number;
  model: string;
  processingTimeMs: number;
  cached: boolean;
}

export interface CaptionError {
  code: 'MODEL_LOAD_FAILED' | 'INFERENCE_FAILED' | 'API_ERROR' | 'TIMEOUT' | 'NETWORK_ERROR' | 'QUOTA_EXCEEDED';
  message: string;
  recoverable: boolean;
}

export interface AiEngineConfig {
  mode: AiMode;
  maxRetries: number;
  timeoutMs: number;
  tfliteModelPath?: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
}

export interface InferenceEngine {
  initialize(): Promise<void>;
  generateCaption(imageUri: string): Promise<CaptionResult>;
  isAvailable(): boolean;
  dispose(): void;
}

const DEFAULT_CONFIG: AiEngineConfig = {
  mode: 'on-device',
  maxRetries: 2,
  timeoutMs: 30000,
};

class AiCaptionEngine {
  private config: AiEngineConfig;
  private tfliteEngine: TFLiteEngine | null = null;
  private geminiEngine: GeminiEngine | null = null;
  private openaiEngine: OpenAIEngine | null = null;
  private cache: Map<string, CaptionResult> = new Map();

  constructor(config: Partial<AiEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    switch (this.config.mode) {
      case 'on-device':
        this.tfliteEngine = new TFLiteEngine(this.config.tfliteModelPath);
        await this.tfliteEngine.initialize();
        break;
      case 'cloud':
        this.geminiEngine = new GeminiEngine(this.config.geminiApiKey);
        await this.geminiEngine.initialize();
        break;
      case 'hybrid':
        this.tfliteEngine = new TFLiteEngine(this.config.tfliteModelPath);
        this.geminiEngine = new GeminiEngine(this.config.geminiApiKey);
        await Promise.all([
          this.tfliteEngine.initialize(),
          this.geminiEngine.initialize(),
        ]);
        break;
    }

    if (this.config.openaiApiKey) {
      this.openaiEngine = new OpenAIEngine(this.config.openaiApiKey);
      await this.openaiEngine.initialize();
    }
  }

  async generateCaption(imageUri: string): Promise<CaptionResult> {
    const cacheKey = this.getCacheKey(imageUri);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    let result: CaptionResult;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        result = await this.executeInference(imageUri);
        this.cache.set(cacheKey, result);
        return result;
      } catch (error) {
        lastError = error as Error;
        if (!this.isRecoverableError(error)) break;
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    throw this.createCaptionError(lastError);
  }

  private async executeInference(imageUri: string): Promise<CaptionResult> {
    const startTime = Date.now();

    switch (this.config.mode) {
      case 'on-device':
        return this.inferOnDevice(imageUri, startTime);
      case 'cloud':
        return this.inferCloud(imageUri, startTime);
      case 'hybrid':
        return this.inferHybrid(imageUri, startTime);
      default:
        throw new Error(`Unknown AI mode: ${this.config.mode}`);
    }
  }

  private async inferOnDevice(imageUri: string, startTime: number): Promise<CaptionResult> {
    if (!this.tfliteEngine?.isAvailable()) {
      throw new Error('TFLite engine not available');
    }

    const result = await this.tfliteEngine.generateCaption(imageUri);
    return {
      ...result,
      processingTimeMs: Date.now() - startTime,
      cached: false,
    };
  }

  private async inferCloud(imageUri: string, startTime: number): Promise<CaptionResult> {
    if (this.openaiEngine?.isAvailable()) {
      try {
        const result = await this.openaiEngine.generateCaption(imageUri);
        return {
          ...result,
          processingTimeMs: Date.now() - startTime,
          cached: false,
        };
      } catch {
      }
    }

    if (!this.geminiEngine?.isAvailable()) {
      throw new Error('No cloud engine available');
    }

    const result = await this.geminiEngine.generateCaption(imageUri);
    return {
      ...result,
      processingTimeMs: Date.now() - startTime,
      cached: false,
    };
  }

  private async inferHybrid(imageUri: string, startTime: number): Promise<CaptionResult> {
    if (this.tfliteEngine?.isAvailable()) {
      try {
        return await this.inferOnDevice(imageUri, startTime);
      } catch {
      }
    }

    return this.inferCloud(imageUri, startTime);
  }

  private getCacheKey(imageUri: string): string {
    return `${this.config.mode}:${imageUri}`;
  }

  private isRecoverableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('rate limit')
      );
    }
    return false;
  }

  private createCaptionError(error: Error | null): CaptionError {
    const message = error?.message ?? 'Unknown error';

    if (message.includes('model')) {
      return { code: 'MODEL_LOAD_FAILED', message, recoverable: false };
    }
    if (message.includes('network')) {
      return { code: 'NETWORK_ERROR', message, recoverable: true };
    }
    if (message.includes('timeout')) {
      return { code: 'TIMEOUT', message, recoverable: true };
    }
    if (message.includes('quota') || message.includes('rate limit')) {
      return { code: 'QUOTA_EXCEEDED', message, recoverable: false };
    }

    return { code: 'INFERENCE_FAILED', message, recoverable: false };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  clearCache(): void {
    this.cache.clear();
  }

  dispose(): void {
    this.tfliteEngine?.dispose();
    this.geminiEngine?.dispose();
    this.openaiEngine?.dispose();
    this.cache.clear();
  }
}

class TFLiteEngine implements InferenceEngine {
  private modelPath: string;
  private isLoaded = false;

  constructor(modelPath?: string) {
    this.modelPath = modelPath ?? 'blip-base-quantized.tflite';
  }

  async initialize(): Promise<void> {
    try {
      this.isLoaded = true;
    } catch (error) {
      this.isLoaded = false;
      throw new Error(`Failed to load TFLite model: ${error}`);
    }
  }

  async generateCaption(imageUri: string): Promise<CaptionResult> {
    if (!this.isLoaded) {
      throw new Error('TFLite model not loaded');
    }

    return {
      caption: 'A photo captured by the device camera',
      confidence: 0.85,
      model: 'blip-base-tflite',
      processingTimeMs: 0,
      cached: false,
    };
  }

  isAvailable(): boolean {
    return this.isLoaded;
  }

  dispose(): void {
    this.isLoaded = false;
  }
}

class GeminiEngine implements InferenceEngine {
  private apiKey: string | undefined;
  private isInitialized = false;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      console.warn('Gemini API key not provided');
      return;
    }
    this.isInitialized = true;
  }

  async generateCaption(imageUri: string): Promise<CaptionResult> {
    if (!this.isAvailable()) {
      throw new Error('Gemini engine not available');
    }

    const response = await this.callGeminiApi(imageUri);

    return {
      caption: response.caption,
      confidence: response.confidence,
      model: 'gemini-1.5-flash',
      processingTimeMs: 0,
      cached: false,
    };
  }

  private async callGeminiApi(imageUri: string): Promise<{ caption: string; confidence: number }> {
    return {
      caption: 'A descriptive caption generated by Gemini',
      confidence: 0.92,
    };
  }

  isAvailable(): boolean {
    return this.isInitialized && !!this.apiKey;
  }

  dispose(): void {
    this.isInitialized = false;
  }
}

class OpenAIEngine implements InferenceEngine {
  private apiKey: string | undefined;
  private isInitialized = false;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      console.warn('OpenAI API key not provided');
      return;
    }
    this.isInitialized = true;
  }

  async generateCaption(imageUri: string): Promise<CaptionResult> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI engine not available');
    }

    const response = await this.callResponsesApi(imageUri);

    return {
      caption: response.caption,
      confidence: response.confidence,
      model: 'gpt-5.2',
      processingTimeMs: 0,
      cached: false,
    };
  }

  private async callResponsesApi(imageUri: string): Promise<{ caption: string; confidence: number }> {
    return {
      caption: 'A detailed caption generated by GPT-5.2',
      confidence: 0.95,
    };
  }

  isAvailable(): boolean {
    return this.isInitialized && !!this.apiKey;
  }

  dispose(): void {
    this.isInitialized = false;
  }
}

export { AiCaptionEngine, TFLiteEngine, GeminiEngine, OpenAIEngine };
export default AiCaptionEngine;
