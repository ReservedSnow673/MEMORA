import * as FileSystem from 'expo-file-system';
import { getApiKeys } from './apiKeys';

// OpenAI temporarily disabled - uncomment to re-enable
// export type AIProvider = 'openai' | 'gemini';
export type AIProvider = 'gemini';

export interface CaptionResult {
  caption: string;
  confidence: number;
  provider: AIProvider;
  isFromFallback: boolean;
  processingTimeMs: number;
  error?: string;
}

export interface AIServiceConfig {
  // openaiApiKey?: string; // OpenAI temporarily disabled
  geminiApiKey?: string;
  preferredProvider: AIProvider;
  enableFallback: boolean;
  maxRetries: number;
}

// const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'; // OpenAI temporarily disabled
// Using Gemini 2.5 Flash-Lite - reliable free model for image captioning
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

const ACCESSIBILITY_PROMPT_SHORT = `Generate a concise alt text description for this image in 15 words or less. Focus on the main subject and key visual elements important for accessibility. Do not include "Image of" or "Photo of" in your response.`;

const ACCESSIBILITY_PROMPT_DETAILED = `Describe this image for a person who cannot see it. Include: the main subject, setting, colors, actions, and emotional tone. Keep the description under 150 words. Be factual and objective.`;

export class CaptioningService {
  private config: AIServiceConfig;

  constructor(config: Partial<AIServiceConfig> = {}) {
    // Get keys from centralized API key management (Redux + .env fallback)
    const centralizedKeys = getApiKeys();
    
    // Helper to check if a key is valid (not empty, not undefined, not placeholder)
    const isValidKey = (key?: string) => {
      if (!key) return false;
      if (key.includes('your-') || key.includes('placeholder') || key === '') return false;
      return true;
    };
    
    this.config = {
      preferredProvider: 'gemini', // Only Gemini supported currently
      enableFallback: false, // No fallback with single provider
      maxRetries: config.maxRetries ?? 2,
      // Use centralized keys, only override if user explicitly provides a VALID key
      // openaiApiKey: isValidKey(config.openaiApiKey) ? config.openaiApiKey : centralizedKeys.openaiApiKey, // OpenAI temporarily disabled
      geminiApiKey: isValidKey(config.geminiApiKey) ? config.geminiApiKey : centralizedKeys.geminiApiKey,
    };
    
    // Debug: log which keys are available
    console.log('[CaptioningService] Initialized with keys:', {
      // hasOpenAI: !!this.config.openaiApiKey, // OpenAI temporarily disabled
      hasGemini: !!this.config.geminiApiKey,
      provider: this.config.preferredProvider,
    });
  }

  updateConfig(config: Partial<AIServiceConfig>): void {
    // Re-fetch centralized keys when updating config
    const centralizedKeys = getApiKeys();
    const isValidKey = (key?: string) => {
      if (!key) return false;
      if (key.includes('your-') || key.includes('placeholder') || key === '') return false;
      return true;
    };
    
    this.config = { 
      ...this.config, 
      ...config,
      preferredProvider: 'gemini', // Force Gemini
      // Ensure we always have the latest keys
      // openaiApiKey: isValidKey(config.openaiApiKey) ? config.openaiApiKey : (this.config.openaiApiKey || centralizedKeys.openaiApiKey), // OpenAI temporarily disabled
      geminiApiKey: isValidKey(config.geminiApiKey) ? config.geminiApiKey : (this.config.geminiApiKey || centralizedKeys.geminiApiKey),
    };
  }

  async generateCaption(
    imageUri: string,
    detailed: boolean = false
  ): Promise<CaptionResult> {
    const startTime = Date.now();
    const providers = this.getProviderOrder();

    // Debug: Log the full flow
    console.log('[CaptioningService] generateCaption called:', {
      imageUri: imageUri.substring(0, 50) + '...',
      detailed,
      preferredProvider: this.config.preferredProvider,
      providerOrder: providers,
      // hasOpenAIKey: !!this.config.openaiApiKey, // OpenAI temporarily disabled
      hasGeminiKey: !!this.config.geminiApiKey,
      // openAIKeyPreview: this.config.openaiApiKey?.substring(0, 10) + '...', // OpenAI temporarily disabled
      geminiKeyPreview: this.config.geminiApiKey?.substring(0, 10) + '...',
    });

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      const isRetry = i > 0;

      console.log(`[CaptioningService] Trying provider ${i + 1}/${providers.length}: ${provider}`);

      try {
        const caption = await this.callProvider(provider, imageUri, detailed);
        console.log(`[CaptioningService] Provider ${provider} succeeded:`, caption.substring(0, 50));
        const confidence = this.evaluateConfidence(caption);

        return {
          caption,
          confidence,
          provider,
          isFromFallback: isRetry,
          processingTimeMs: Date.now() - startTime,
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[CaptioningService] Provider ${provider} FAILED:`, errorMsg);
        
        if (!this.config.enableFallback || i === providers.length - 1) {
          console.log(`[CaptioningService] No more fallbacks, returning error result`);
          return {
            caption: this.getFallbackCaption(detailed),
            confidence: 0,
            provider,
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
      provider: this.config.preferredProvider,
      isFromFallback: true,
      processingTimeMs: Date.now() - startTime,
      error: 'All providers failed',
    };
  }

  private getProviderOrder(): AIProvider[] {
    // Only Gemini supported currently
    return ['gemini'];
    
    /* OpenAI fallback temporarily disabled
    const order: AIProvider[] = [this.config.preferredProvider];
    
    if (this.config.enableFallback) {
      // Fall back between cloud providers
      if (this.config.preferredProvider !== 'gemini' && this.config.geminiApiKey) {
        order.push('gemini');
      }
      if (this.config.preferredProvider !== 'openai' && this.config.openaiApiKey) {
        order.push('openai');
      }
    }

    return order;
    */
  }

  private async callProvider(
    provider: AIProvider,
    imageUri: string,
    detailed: boolean
  ): Promise<string> {
    switch (provider) {
      // case 'openai': // OpenAI temporarily disabled
      //   return this.callOpenAI(imageUri, detailed);
      case 'gemini':
        return this.callGemini(imageUri, detailed);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /* OpenAI temporarily disabled - uncomment to re-enable
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
  */

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

  /* OpenAI temporarily disabled - uncomment to re-enable
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
  */

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
      // OpenAI temporarily disabled
      // {
      //   provider: 'openai',
      //   available: !!this.config.openaiApiKey,
      // },
      {
        provider: 'gemini',
        available: !!this.config.geminiApiKey,
      },
    ];
  }
}

export const createCaptioningService = (config?: Partial<AIServiceConfig>) =>
  new CaptioningService(config);

export default CaptioningService;
