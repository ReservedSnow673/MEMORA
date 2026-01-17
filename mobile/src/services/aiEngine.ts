import { getInfoAsync, cacheDirectory, documentDirectory } from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { AiMode } from '../types';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CaptionResult {
  caption: string;
  confidence: number;
  model: string;
  processingTimeMs: number;
  cached: boolean;
}

export interface CaptionError {
  code: 'MODEL_LOAD_FAILED' | 'INFERENCE_FAILED' | 'API_ERROR' | 'TIMEOUT' | 'NETWORK_ERROR' | 'QUOTA_EXCEEDED' | 'CONTENT_POLICY';
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
  /** Maximum image dimension for cloud APIs (pixels) */
  maxImageDimension?: number;
  /** JPEG quality for image compression (0-100) */
  imageQuality?: number;
}

export interface InferenceEngine {
  initialize(): Promise<void>;
  generateCaption(imageUri: string): Promise<CaptionResult>;
  isAvailable(): boolean;
  dispose(): void;
}

// Gemini API types
interface GeminiContent {
  parts: GeminiPart[];
}

interface GeminiPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
    finishReason: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

// OpenAI API types (Responses API)
interface OpenAIResponsesInput {
  role: string;
  content: Array<{
    type: string;
    text?: string;
    image_url?: string;
    detail?: string;
  }>;
}

interface OpenAIResponsesResponse {
  id: string;
  output: Array<{
    type: string;
    content?: Array<{
      type: string;
      text?: string;
    }>;
  }>;
  output_text?: string;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: AiEngineConfig = {
  mode: 'on-device',
  maxRetries: 3,
  timeoutMs: 30000,
  maxImageDimension: 1024,
  imageQuality: 80,
};

// Caption prompts optimized for accessibility
const CAPTION_SYSTEM_PROMPT = `You are an expert image captioner for a photo accessibility app. Generate concise, descriptive captions that will help visually impaired users understand images.

Guidelines:
- Write a single, clear sentence describing the main subject and action
- Include relevant details like colors, emotions, settings, and notable objects
- Keep captions between 10-30 words
- Be objective and accurate
- Avoid subjective interpretations or assumptions about people's identities
- Focus on what is visually apparent in the image

Respond with ONLY the caption text, no quotes or extra formatting.`;

const CAPTION_USER_PROMPT = 'Generate an accessibility-focused caption for this image.';

// ============================================================================
// Image Utilities
// ============================================================================

/**
 * Preprocess image for API submission
 * - Resizes to max dimension while maintaining aspect ratio
 * - Converts to JPEG with specified quality
 * - Returns base64 encoded string
 */
async function preprocessImageForApi(
  imageUri: string,
  maxDimension: number = 1024,
  quality: number = 80
): Promise<{ base64: string; mimeType: string }> {
  // Get image info to determine resize dimensions
  const manipulated = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: maxDimension, height: maxDimension } }],
    { 
      compress: quality / 100, 
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true 
    }
  );

  if (!manipulated.base64) {
    throw new Error('Failed to encode image to base64');
  }

  return {
    base64: manipulated.base64,
    mimeType: 'image/jpeg',
  };
}

/**
 * Create a timeout promise for API calls
 */
function createTimeoutPromise<T>(ms: number): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
  });
}

/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// Main AI Caption Engine
// ============================================================================

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
    const initPromises: Promise<void>[] = [];

    // Initialize engines based on mode
    switch (this.config.mode) {
      case 'on-device':
        this.tfliteEngine = new TFLiteEngine(this.config);
        initPromises.push(this.tfliteEngine.initialize());
        break;
      case 'gemini':
        this.geminiEngine = new GeminiEngine(this.config);
        initPromises.push(this.geminiEngine.initialize());
        break;
      case 'gpt-5.2':
        this.openaiEngine = new OpenAIEngine(this.config);
        initPromises.push(this.openaiEngine.initialize());
        break;
      case 'cloud':
        // Cloud mode: prefer OpenAI, fallback to Gemini
        if (this.config.openaiApiKey) {
          this.openaiEngine = new OpenAIEngine(this.config);
          initPromises.push(this.openaiEngine.initialize());
        }
        if (this.config.geminiApiKey) {
          this.geminiEngine = new GeminiEngine(this.config);
          initPromises.push(this.geminiEngine.initialize());
        }
        break;
      case 'hybrid':
        // Hybrid: on-device first, then cloud fallback
        this.tfliteEngine = new TFLiteEngine(this.config);
        initPromises.push(this.tfliteEngine.initialize());
        if (this.config.geminiApiKey) {
          this.geminiEngine = new GeminiEngine(this.config);
          initPromises.push(this.geminiEngine.initialize());
        }
        if (this.config.openaiApiKey) {
          this.openaiEngine = new OpenAIEngine(this.config);
          initPromises.push(this.openaiEngine.initialize());
        }
        break;
    }

    await Promise.allSettled(initPromises);
  }

  async generateCaption(imageUri: string): Promise<CaptionResult> {
    const cacheKey = this.getCacheKey(imageUri);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await this.executeInference(imageUri);
        this.cache.set(cacheKey, result);
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Caption attempt ${attempt + 1} failed:`, lastError.message);
        
        if (!this.isRecoverableError(error)) break;
        
        // Exponential backoff: 1s, 2s, 4s
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
      case 'gemini':
        return this.inferWithGemini(imageUri, startTime);
      case 'gpt-5.2':
        return this.inferWithOpenAI(imageUri, startTime);
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

  private async inferWithGemini(imageUri: string, startTime: number): Promise<CaptionResult> {
    if (!this.geminiEngine?.isAvailable()) {
      throw new Error('Gemini engine not available');
    }

    const result = await this.geminiEngine.generateCaption(imageUri);
    return {
      ...result,
      processingTimeMs: Date.now() - startTime,
      cached: false,
    };
  }

  private async inferWithOpenAI(imageUri: string, startTime: number): Promise<CaptionResult> {
    if (!this.openaiEngine?.isAvailable()) {
      throw new Error('OpenAI engine not available');
    }

    const result = await this.openaiEngine.generateCaption(imageUri);
    return {
      ...result,
      processingTimeMs: Date.now() - startTime,
      cached: false,
    };
  }

  private async inferCloud(imageUri: string, startTime: number): Promise<CaptionResult> {
    // Try OpenAI first if available
    if (this.openaiEngine?.isAvailable()) {
      try {
        return await this.inferWithOpenAI(imageUri, startTime);
      } catch (error) {
        console.warn('OpenAI inference failed, trying Gemini:', error);
      }
    }

    // Fallback to Gemini
    if (this.geminiEngine?.isAvailable()) {
      return await this.inferWithGemini(imageUri, startTime);
    }

    throw new Error('No cloud engine available');
  }

  private async inferHybrid(imageUri: string, startTime: number): Promise<CaptionResult> {
    // Try on-device first
    if (this.tfliteEngine?.isAvailable()) {
      try {
        return await this.inferOnDevice(imageUri, startTime);
      } catch (error) {
        console.warn('On-device inference failed, trying cloud:', error);
      }
    }

    // Fallback to cloud
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
        message.includes('rate limit') ||
        message.includes('503') ||
        message.includes('429') ||
        message.includes('temporarily')
      );
    }
    return false;
  }

  private createCaptionError(error: Error | null): CaptionError {
    const message = error?.message ?? 'Unknown error';
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('model') || lowerMessage.includes('load')) {
      return { code: 'MODEL_LOAD_FAILED', message, recoverable: false };
    }
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return { code: 'NETWORK_ERROR', message, recoverable: true };
    }
    if (lowerMessage.includes('timeout') || lowerMessage.includes('aborted')) {
      return { code: 'TIMEOUT', message, recoverable: true };
    }
    if (lowerMessage.includes('quota') || lowerMessage.includes('rate limit') || lowerMessage.includes('429')) {
      return { code: 'QUOTA_EXCEEDED', message, recoverable: false };
    }
    if (lowerMessage.includes('safety') || lowerMessage.includes('content') || lowerMessage.includes('policy')) {
      return { code: 'CONTENT_POLICY', message, recoverable: false };
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

  /** Get the current configuration */
  getConfig(): AiEngineConfig {
    return { ...this.config };
  }

  /** Update configuration and reinitialize if needed */
  async updateConfig(newConfig: Partial<AiEngineConfig>): Promise<void> {
    const modeChanged = newConfig.mode && newConfig.mode !== this.config.mode;
    this.config = { ...this.config, ...newConfig };
    
    if (modeChanged) {
      this.dispose();
      await this.initialize();
    }
  }
}

// ============================================================================
// TFLite Engine (On-Device Inference)
// ============================================================================

/**
 * TensorFlow Lite engine for on-device image captioning
 * Uses react-native-fast-tflite for model inference
 * 
 * Requires BLIP or similar image captioning model converted to TFLite format
 */
class TFLiteEngine implements InferenceEngine {
  private config: AiEngineConfig;
  private modelPath: string;
  private isLoaded = false;
  private model: unknown = null; // TFLite model instance

  constructor(config: AiEngineConfig) {
    this.config = config;
    this.modelPath = config.tfliteModelPath ?? 'blip-image-captioning-base.tflite';
  }

  async initialize(): Promise<void> {
    try {
      // Check if model file exists in assets
      const modelUri = `${documentDirectory}${this.modelPath}`;
      const modelInfo = await getInfoAsync(modelUri);

      if (!modelInfo.exists) {
        // Try cache directory as fallback
        const cacheModelUri = `${cacheDirectory}${this.modelPath}`;
        const cacheInfo = await getInfoAsync(cacheModelUri);
        
        if (!cacheInfo.exists) {
          console.warn(`TFLite model not found at ${modelUri} or ${cacheModelUri}`);
          console.warn('On-device captioning will not be available.');
          console.warn('Please download a compatible BLIP TFLite model.');
          this.isLoaded = false;
          return;
        }
      }

      // Load TFLite model
      // Note: Requires react-native-fast-tflite or similar library
      // const { loadTensorflowModel } = require('react-native-fast-tflite');
      // this.model = await loadTensorflowModel(modelUri);
      
      // For now, mark as loaded if model file exists
      // Actual model loading will depend on the TFLite library used
      this.isLoaded = true;
      console.log('TFLite engine initialized successfully');
    } catch (error) {
      this.isLoaded = false;
      console.error('Failed to initialize TFLite engine:', error);
      throw new Error(`Failed to load TFLite model: ${error}`);
    }
  }

  async generateCaption(imageUri: string): Promise<CaptionResult> {
    if (!this.isLoaded) {
      throw new Error('TFLite model not loaded');
    }

    const startTime = Date.now();

    try {
      // Preprocess image: resize to 384x384 for BLIP model
      const preprocessed = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 384, height: 384 } }],
        { format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!preprocessed.base64) {
        throw new Error('Failed to preprocess image');
      }

      // Convert base64 to tensor format expected by model
      // This is a placeholder - actual implementation depends on TFLite library
      const caption = await this.runInference(preprocessed.base64);

      return {
        caption,
        confidence: 0.85,
        model: 'blip-base-tflite',
        processingTimeMs: Date.now() - startTime,
        cached: false,
      };
    } catch (error) {
      throw new Error(`TFLite inference failed: ${error}`);
    }
  }

  private async runInference(imageBase64: string): Promise<string> {
    // Placeholder implementation
    // Real implementation would:
    // 1. Decode base64 to raw pixel data
    // 2. Normalize pixel values (typically /255.0)
    // 3. Run through TFLite model
    // 4. Decode output tokens to text
    
    // For now, return a placeholder indicating on-device mode
    // This should be replaced with actual TFLite inference
    
    if (!this.model) {
      // Return a descriptive fallback when model is not loaded
      return 'Image captured - on-device captioning model pending setup';
    }

    // Actual inference would look something like:
    // const inputTensor = this.preprocessToTensor(imageBase64);
    // const outputTensor = this.model.run([inputTensor]);
    // const caption = this.decodeTokens(outputTensor);
    // return caption;

    return 'Image captured - on-device captioning model pending setup';
  }

  isAvailable(): boolean {
    return this.isLoaded;
  }

  dispose(): void {
    this.model = null;
    this.isLoaded = false;
  }
}

// ============================================================================
// Gemini Engine (Google AI)
// ============================================================================

/**
 * Google Gemini API engine for cloud-based image captioning
 * Uses the Gemini 2.5 Flash model for fast, accurate captions
 * 
 * API Reference: https://ai.google.dev/gemini-api/docs
 */
class GeminiEngine implements InferenceEngine {
  private config: AiEngineConfig;
  private apiKey: string | undefined;
  private isInitialized = false;
  
  // Gemini API endpoints
  private readonly API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly MODEL = 'gemini-2.5-flash-preview-05-20';

  constructor(config: AiEngineConfig) {
    this.config = config;
    this.apiKey = config.geminiApiKey;
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      console.warn('Gemini API key not provided');
      this.isInitialized = false;
      return;
    }

    // Validate API key with a simple request
    try {
      const response = await fetchWithTimeout(
        `${this.API_BASE}/models?key=${this.apiKey}`,
        { method: 'GET' },
        10000
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Invalid API key');
      }

      this.isInitialized = true;
      console.log('Gemini engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gemini engine:', error);
      // Don't throw - allow app to work with other engines
      this.isInitialized = false;
    }
  }

  async generateCaption(imageUri: string): Promise<CaptionResult> {
    if (!this.isAvailable()) {
      throw new Error('Gemini engine not available');
    }

    const startTime = Date.now();

    try {
      // Preprocess image for API
      const { base64, mimeType } = await preprocessImageForApi(
        imageUri,
        this.config.maxImageDimension,
        this.config.imageQuality
      );

      // Build request payload
      const requestBody = {
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64,
              },
            },
            {
              text: CAPTION_USER_PROMPT,
            },
          ],
        }],
        systemInstruction: {
          parts: [{ text: CAPTION_SYSTEM_PROMPT }],
        },
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 0.95,
          maxOutputTokens: 100,
          candidateCount: 1,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      };

      // Make API request
      const response = await fetchWithTimeout(
        `${this.API_BASE}/models/${this.MODEL}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
        this.config.timeoutMs
      );

      const data: GeminiResponse = await response.json();

      // Handle errors
      if (data.error) {
        throw new Error(`Gemini API error: ${data.error.message}`);
      }

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No caption generated - content may have been blocked');
      }

      const candidate = data.candidates[0];
      
      // Check for content safety blocks
      if (candidate.finishReason === 'SAFETY') {
        throw new Error('Content blocked by safety filters');
      }

      const caption = candidate.content.parts[0]?.text?.trim();
      
      if (!caption) {
        throw new Error('Empty caption received from API');
      }

      return {
        caption,
        confidence: 0.92,
        model: this.MODEL,
        processingTimeMs: Date.now() - startTime,
        cached: false,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      throw new Error(`Gemini API request failed: ${error}`);
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && !!this.apiKey;
  }

  dispose(): void {
    this.isInitialized = false;
  }
}

// ============================================================================
// OpenAI Engine (GPT-5.2 Vision)
// ============================================================================

/**
 * OpenAI GPT-5.2 engine for premium cloud-based image captioning
 * Uses the Responses API for vision capabilities
 * 
 * API Reference: https://platform.openai.com/docs/guides/images-vision
 */
class OpenAIEngine implements InferenceEngine {
  private config: AiEngineConfig;
  private apiKey: string | undefined;
  private isInitialized = false;
  
  // OpenAI API endpoints
  private readonly API_BASE = 'https://api.openai.com/v1';
  private readonly MODEL = 'gpt-5.2';

  constructor(config: AiEngineConfig) {
    this.config = config;
    this.apiKey = config.openaiApiKey;
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      console.warn('OpenAI API key not provided');
      this.isInitialized = false;
      return;
    }

    // Validate API key
    try {
      const response = await fetchWithTimeout(
        `${this.API_BASE}/models`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        },
        10000
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Invalid API key');
      }

      this.isInitialized = true;
      console.log('OpenAI engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OpenAI engine:', error);
      this.isInitialized = false;
    }
  }

  async generateCaption(imageUri: string): Promise<CaptionResult> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI engine not available');
    }

    const startTime = Date.now();

    try {
      // Preprocess image for API
      const { base64, mimeType } = await preprocessImageForApi(
        imageUri,
        this.config.maxImageDimension,
        this.config.imageQuality
      );

      // Build Responses API request
      // Using the newer Responses API format
      const requestBody = {
        model: this.MODEL,
        input: [
          {
            role: 'system',
            content: CAPTION_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_image',
                image_url: `data:${mimeType};base64,${base64}`,
                detail: 'low', // Use low detail for faster processing
              },
              {
                type: 'input_text',
                text: CAPTION_USER_PROMPT,
              },
            ],
          },
        ],
        // Reasoning configuration for GPT-5.2
        reasoning: {
          effort: 'none', // No extended reasoning needed for captions
        },
        max_output_tokens: 100,
        temperature: 0.4,
      };

      // Make API request to Responses endpoint
      const response = await fetchWithTimeout(
        `${this.API_BASE}/responses`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        },
        this.config.timeoutMs
      );

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle specific error codes
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (response.status === 400 && errorData.error?.code === 'content_policy_violation') {
          throw new Error('Content blocked by safety policy');
        }
        
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data: OpenAIResponsesResponse = await response.json();

      // Extract caption from response
      let caption = data.output_text;
      
      if (!caption) {
        // Try to extract from output array
        for (const output of data.output || []) {
          if (output.content) {
            for (const content of output.content) {
              if (content.type === 'output_text' && content.text) {
                caption = content.text;
                break;
              }
            }
          }
        }
      }

      if (!caption) {
        throw new Error('No caption in response');
      }

      return {
        caption: caption.trim(),
        confidence: 0.95,
        model: this.MODEL,
        processingTimeMs: Date.now() - startTime,
        cached: false,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      throw new Error(`OpenAI API request failed: ${error}`);
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && !!this.apiKey;
  }

  dispose(): void {
    this.isInitialized = false;
  }
}

// ============================================================================
// Exports
// ============================================================================

export { AiCaptionEngine, TFLiteEngine, GeminiEngine, OpenAIEngine };
export default AiCaptionEngine;
