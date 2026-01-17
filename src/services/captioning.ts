import * as FileSystem from 'expo-file-system';
import { processImageFromUri } from './visionLite';
import type { VisionResult } from './visionLite';
import { getApiKeys } from './apiKeys';

export type AIProvider = 'openai' | 'gemini' | 'ondevice';

export interface CaptionResult {
  caption: string;
  confidence: number;
  provider: AIProvider;
  isFromFallback: boolean;
  processingTimeMs: number;
  error?: string;
}

export interface AIServiceConfig {
  openaiApiKey?: string;
  geminiApiKey?: string;
  preferredProvider: AIProvider;
  enableFallback: boolean;
  maxRetries: number;
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const ACCESSIBILITY_PROMPT_SHORT = `Generate a concise alt text description for this image in 15 words or less. Focus on the main subject and key visual elements important for accessibility. Do not include "Image of" or "Photo of" in your response.`;

const ACCESSIBILITY_PROMPT_DETAILED = `Describe this image for a person who cannot see it. Include: the main subject, setting, colors, actions, and emotional tone. Keep the description under 150 words. Be factual and objective.`;

export class CaptioningService {
  private config: AIServiceConfig;

  constructor(config: Partial<AIServiceConfig> = {}) {
    // Get keys from centralized API key management
    const centralizedKeys = getApiKeys();
    
    this.config = {
      preferredProvider: config.preferredProvider || 'gemini',
      enableFallback: config.enableFallback ?? true,
      maxRetries: config.maxRetries ?? 2,
      // Priority: user-provided key > centralized keys (from Redux/env)
      openaiApiKey: config.openaiApiKey || centralizedKeys.openaiApiKey,
      geminiApiKey: config.geminiApiKey || centralizedKeys.geminiApiKey,
    };
  }

  updateConfig(config: Partial<AIServiceConfig>): void {
    // Re-fetch centralized keys when updating config
    const centralizedKeys = getApiKeys();
    this.config = { 
      ...this.config, 
      ...config,
      // Ensure we always have the latest keys
      openaiApiKey: config.openaiApiKey || this.config.openaiApiKey || centralizedKeys.openaiApiKey,
      geminiApiKey: config.geminiApiKey || this.config.geminiApiKey || centralizedKeys.geminiApiKey,
    };
  }

  async generateCaption(
    imageUri: string,
    detailed: boolean = false
  ): Promise<CaptionResult> {
    const startTime = Date.now();
    const providers = this.getProviderOrder();
    const isOnDeviceMode = this.config.preferredProvider === 'ondevice';

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      const isRetry = i > 0;

      try {
        const caption = await this.callProvider(provider, imageUri, detailed);
        const confidence = this.evaluateConfidence(caption);

        return {
          caption,
          confidence,
          // For ondevice mode, always report 'ondevice' to hide actual provider
          provider: isOnDeviceMode ? 'ondevice' : provider,
          isFromFallback: isOnDeviceMode ? false : isRetry,
          processingTimeMs: Date.now() - startTime,
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        
        if (!this.config.enableFallback || i === providers.length - 1) {
          return {
            caption: this.getFallbackCaption(detailed),
            confidence: 0,
            provider: isOnDeviceMode ? 'ondevice' : provider,
            isFromFallback: true,
            processingTimeMs: Date.now() - startTime,
            error: errorMsg,
          };
        }
        // Continue to next provider in fallback chain
      }
    }

    return {
      caption: this.getFallbackCaption(detailed),
      confidence: 0,
      provider: 'ondevice',
      isFromFallback: true,
      processingTimeMs: Date.now() - startTime,
      error: 'All providers failed',
    };
  }

  private getProviderOrder(): AIProvider[] {
    // Special handling for 'ondevice' - try on-device first, then cloud APIs as fallback
    if (this.config.preferredProvider === 'ondevice') {
      const order: AIProvider[] = ['ondevice'];
      // Fallback to OpenAI if available
      if (this.config.openaiApiKey) {
        order.push('openai');
      }
      // Then Gemini as secondary fallback
      if (this.config.geminiApiKey) {
        order.push('gemini');
      }
      return order;
    }

    // For cloud providers (gemini, openai), DO NOT fall back to on-device
    // On-device is only used when explicitly selected
    const order: AIProvider[] = [this.config.preferredProvider];
    
    if (this.config.enableFallback) {
      // Only fall back between cloud providers, never to on-device
      if (this.config.preferredProvider !== 'gemini' && this.config.geminiApiKey) {
        order.push('gemini');
      }
      if (this.config.preferredProvider !== 'openai' && this.config.openaiApiKey) {
        order.push('openai');
      }
      // NOTE: We intentionally do NOT add 'ondevice' as fallback for cloud providers
      // On-device processing should only be used when explicitly selected
    }

    return order;
  }

  private async callProvider(
    provider: AIProvider,
    imageUri: string,
    detailed: boolean
  ): Promise<string> {
    switch (provider) {
      case 'openai':
        return this.callOpenAI(imageUri, detailed);
      case 'gemini':
        return this.callGemini(imageUri, detailed);
      case 'ondevice':
        return this.callOnDevice(imageUri, detailed);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  private async callOpenAI(imageUri: string, detailed: boolean): Promise<string> {
    if (!this.config.openaiApiKey) {
      throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.');
    }

    const base64Image = await this.imageToBase64(imageUri);
    const prompt = detailed ? ACCESSIBILITY_PROMPT_DETAILED : ACCESSIBILITY_PROMPT_SHORT;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'low',
                },
              },
            ],
          },
        ],
        max_tokens: detailed ? 200 : 100,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('No caption in OpenAI response');
    }

    return data.choices[0].message.content.trim();
  }

  private async callGemini(imageUri: string, detailed: boolean): Promise<string> {
    if (!this.config.geminiApiKey) {
      throw new Error('Gemini API key not configured. Please add GEMINI_API_KEY to your .env file.');
    }

    const base64Image = await this.imageToBase64(imageUri);
    const prompt = detailed ? ACCESSIBILITY_PROMPT_DETAILED : ACCESSIBILITY_PROMPT_SHORT;

    const response = await fetch(`${GEMINI_API_URL}?key=${this.config.geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: detailed ? 200 : 100,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No caption in Gemini response');
    }

    return text.trim();
  }

  private async callOnDevice(imageUri: string, detailed: boolean): Promise<string> {
    // Use Memora Vision Lite v0.5 for on-device processing
    const result: VisionResult = await processImageFromUri(imageUri);
    
    // If the pipeline completely failed, throw error to trigger fallback
    if (!result.success) {
      throw new Error(`On-device processing failed: ${result.error || 'Unknown error'}`);
    }
    
    // Check if we got a meaningful caption (not just the fallback)
    const caption = result.caption_text;
    const isMinimalCaption = caption.toLowerCase().includes('unclear content') || 
                              caption === 'An image.' ||
                              caption.length < 15;
    
    // If confidence is very low AND we got a minimal caption, escalate to cloud
    if (result.confidence_score < 0.2 && isMinimalCaption) {
      throw new Error(`On-device confidence too low (${(result.confidence_score * 100).toFixed(0)}%), falling back to cloud API`);
    }
    
    // If we have a reasonable caption (even with lower confidence), use it
    // This allows text-based captions from OCR to pass through
    if (!isMinimalCaption || result.confidence_score >= 0.3) {
      // For detailed captions, try to expand with more context
      if (detailed) {
        const semantic = result.signal_breakdown.semantic;
        let detailedCaption = caption;
        
        // Add environment context if available
        if (semantic.environment !== 'unknown') {
          detailedCaption = detailedCaption.replace(/\.$/, ` in ${semantic.environment === 'indoor' ? 'an indoor' : 'an outdoor'} setting.`);
        }
        
        // Add text content if present
        if (semantic.textPresent && semantic.textContent) {
          detailedCaption += ` The image contains text: "${semantic.textContent}".`;
        }
        
        // Add object context
        if (semantic.secondaryObjects.length > 0) {
          const objects = semantic.secondaryObjects.slice(0, 3).join(', ');
          detailedCaption += ` Additional elements include: ${objects}.`;
        }
        
        return detailedCaption;
      }
      
      return caption;
    }
    
    // Low confidence with minimal caption - escalate
    throw new Error(`On-device processing could not identify content (${(result.confidence_score * 100).toFixed(0)}% confidence)`);
  }

  private async imageToBase64(uri: string): Promise<string> {
    try {
      return await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (error) {
      throw new Error('Failed to read image file');
    }
  }

  private evaluateConfidence(caption: string): number {
    if (!caption || caption.length === 0) return 0;

    const wordCount = caption.split(/\s+/).length;
    let confidence = 0;

    if (wordCount >= 3) confidence += 30;
    if (wordCount >= 5) confidence += 20;
    if (wordCount >= 10) confidence += 10;

    const hasDescriptiveContent = /\b(person|people|man|woman|child|dog|cat|car|building|tree|sky|water|sitting|standing|walking|smiling)\b/i.test(caption);
    if (hasDescriptiveContent) confidence += 25;

    const genericPatterns = /^(image|photo|picture|screenshot|a photo of|an image of)/i;
    if (!genericPatterns.test(caption)) confidence += 15;

    return Math.min(100, confidence);
  }

  private getFallbackCaption(detailed: boolean): string {
    if (detailed) {
      return 'Image description unavailable. The image could not be processed by the AI service.';
    }
    return 'Image description unavailable';
  }

  async testOpenAIConnection(): Promise<boolean> {
    if (!this.config.openaiApiKey) return false;

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${this.config.openaiApiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async testGeminiConnection(): Promise<boolean> {
    if (!this.config.geminiApiKey) return false;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.config.geminiApiKey}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  getProviderStatus(): { provider: AIProvider; available: boolean }[] {
    return [
      {
        provider: 'openai',
        available: !!this.config.openaiApiKey,
      },
      {
        provider: 'gemini',
        available: !!this.config.geminiApiKey,
      },
      {
        provider: 'ondevice',
        available: true,
      },
    ];
  }
}

export const createCaptioningService = (config?: Partial<AIServiceConfig>) =>
  new CaptioningService(config);

export default CaptioningService;
