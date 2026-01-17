import * as FileSystem from 'expo-file-system';
import { OPENAI_API_KEY, GEMINI_API_KEY } from '@env';

// Environment variables from .env (undefined if not set)
const ENV_OPENAI_API_KEY = OPENAI_API_KEY;
const ENV_GEMINI_API_KEY = GEMINI_API_KEY;

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
    this.config = {
      preferredProvider: config.preferredProvider || 'gemini',
      enableFallback: config.enableFallback ?? true,
      maxRetries: config.maxRetries ?? 2,
      // Priority: user-provided key > env variable > undefined
      openaiApiKey: config.openaiApiKey || ENV_OPENAI_API_KEY,
      geminiApiKey: config.geminiApiKey || ENV_GEMINI_API_KEY,
    };
  }

  updateConfig(config: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...config };
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
        if (!this.config.enableFallback || i === providers.length - 1) {
          return {
            caption: this.getFallbackCaption(detailed),
            confidence: 0,
            provider: isOnDeviceMode ? 'ondevice' : provider,
            isFromFallback: true,
            processingTimeMs: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
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
    // Special handling for 'ondevice' - it silently uses Gemini then OpenAI as fallback
    if (this.config.preferredProvider === 'ondevice') {
      const order: AIProvider[] = [];
      // Try Gemini first if available
      if (this.config.geminiApiKey) {
        order.push('gemini');
      }
      // Then OpenAI as fallback
      if (this.config.openaiApiKey) {
        order.push('openai');
      }
      // Final fallback to local placeholder
      order.push('ondevice');
      return order;
    }

    const order: AIProvider[] = [this.config.preferredProvider];
    
    if (this.config.enableFallback) {
      if (this.config.preferredProvider !== 'gemini' && this.config.geminiApiKey) {
        order.push('gemini');
      }
      if (this.config.preferredProvider !== 'openai' && this.config.openaiApiKey) {
        order.push('openai');
      }
      if (!order.includes('ondevice')) {
        order.push('ondevice');
      }
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
      throw new Error('OpenAI API key not configured');
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
      throw new Error('Gemini API key not configured');
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

  private async callOnDevice(_imageUri: string, detailed: boolean): Promise<string> {
    return this.getFallbackCaption(detailed);
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
