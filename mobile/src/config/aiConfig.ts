/**
 * AI Engine Configuration
 * 
 * This file contains configuration for the AI captioning engines.
 * 
 * IMPORTANT: Do not commit API keys to version control!
 * Use environment variables or a secrets manager in production.
 * 
 * For development, you can:
 * 1. Create a .env file (add to .gitignore)
 * 2. Use expo-constants to load environment variables
 * 3. Use a local secrets.ts file (add to .gitignore)
 */

import { AiMode } from '../types';
import { AiEngineConfig } from '../services/aiEngine';

// ============================================================================
// Environment Configuration
// ============================================================================

/**
 * Get API keys from environment
 * In a production app, these would come from:
 * - expo-constants (Config.extra)
 * - react-native-dotenv
 * - A secure key management system
 */
function getEnvConfig() {
  // Attempt to load from expo constants if available
  try {
    // @ts-ignore - Constants may not be available
    const Constants = require('expo-constants').default;
    return {
      geminiApiKey: Constants.expoConfig?.extra?.geminiApiKey,
      openaiApiKey: Constants.expoConfig?.extra?.openaiApiKey,
    };
  } catch {
    return {
      geminiApiKey: undefined,
      openaiApiKey: undefined,
    };
  }
}

// ============================================================================
// Default Configurations
// ============================================================================

const envConfig = getEnvConfig();

/**
 * Default AI engine configuration
 */
export const DEFAULT_AI_CONFIG: Partial<AiEngineConfig> = {
  mode: 'on-device',
  maxRetries: 3,
  timeoutMs: 30000,
  maxImageDimension: 1024,
  imageQuality: 80,
  geminiApiKey: envConfig.geminiApiKey,
  openaiApiKey: envConfig.openaiApiKey,
};

/**
 * Configuration presets for different use cases
 */
export const AI_CONFIG_PRESETS = {
  /**
   * On-device only - no network required
   * Best for: Privacy-conscious users, offline usage
   */
  onDevice: {
    ...DEFAULT_AI_CONFIG,
    mode: 'on-device' as AiMode,
  },

  /**
   * Gemini cloud - balanced quality and speed
   * Best for: General usage with good internet
   */
  gemini: {
    ...DEFAULT_AI_CONFIG,
    mode: 'gemini' as AiMode,
    maxImageDimension: 1024,
    imageQuality: 85,
  },

  /**
   * GPT-5.2 - premium quality captions
   * Best for: Users who want the highest quality descriptions
   */
  gpt52: {
    ...DEFAULT_AI_CONFIG,
    mode: 'gpt-5.2' as AiMode,
    maxImageDimension: 1024,
    imageQuality: 90,
  },

  /**
   * Hybrid mode - on-device with cloud fallback
   * Best for: Reliability with offline capability
   */
  hybrid: {
    ...DEFAULT_AI_CONFIG,
    mode: 'hybrid' as AiMode,
  },

  /**
   * Cloud mode - prefer OpenAI, fallback to Gemini
   * Best for: Maximum quality with fallback
   */
  cloud: {
    ...DEFAULT_AI_CONFIG,
    mode: 'cloud' as AiMode,
  },
} as const;

// ============================================================================
// Model Information
// ============================================================================

/**
 * Information about available AI models
 */
export const AI_MODELS = {
  'on-device': {
    id: 'on-device',
    name: 'On-Device AI',
    description: 'Process images locally using TensorFlow Lite. No internet required.',
    model: 'Memora BLIP Image Captioning Lite',
    requiresNetwork: false,
    requiresApiKey: false,
    estimatedLatency: '1-3 seconds',
    qualityLevel: 'good',
    privacyLevel: 'maximum',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini AI',
    description: 'Use Google Gemini for high quality captions. Requires internet.',
    model: 'Gemini 2.5 Flash',
    requiresNetwork: true,
    requiresApiKey: true,
    estimatedLatency: '2-5 seconds',
    qualityLevel: 'excellent',
    privacyLevel: 'standard',
    apiKeyUrl: 'https://aistudio.google.com/apikey',
  },
  'gpt-5.2': {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    description: 'Use OpenAI GPT-5.2 for premium quality captions. Requires internet.',
    model: 'GPT-5.2 Vision',
    requiresNetwork: true,
    requiresApiKey: true,
    estimatedLatency: '3-6 seconds',
    qualityLevel: 'premium',
    privacyLevel: 'standard',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
  },
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get configuration for a specific AI mode
 */
export function getConfigForMode(mode: AiMode): Partial<AiEngineConfig> {
  switch (mode) {
    case 'on-device':
      return AI_CONFIG_PRESETS.onDevice;
    case 'gemini':
      return AI_CONFIG_PRESETS.gemini;
    case 'gpt-5.2':
      return AI_CONFIG_PRESETS.gpt52;
    case 'hybrid':
      return AI_CONFIG_PRESETS.hybrid;
    case 'cloud':
      return AI_CONFIG_PRESETS.cloud;
    default:
      return DEFAULT_AI_CONFIG;
  }
}

/**
 * Check if an AI mode is available (has required API keys)
 */
export function isModeAvailable(mode: AiMode): boolean {
  const modelInfo = AI_MODELS[mode as keyof typeof AI_MODELS];
  
  if (!modelInfo) return false;
  
  if (!modelInfo.requiresApiKey) return true;
  
  if (mode === 'gemini' || mode === 'cloud' || mode === 'hybrid') {
    if (envConfig.geminiApiKey) return true;
  }
  
  if (mode === 'gpt-5.2' || mode === 'cloud') {
    if (envConfig.openaiApiKey) return true;
  }
  
  return false;
}

/**
 * Get list of available AI modes
 */
export function getAvailableModes(): AiMode[] {
  const modes: AiMode[] = ['on-device', 'gemini', 'gpt-5.2', 'hybrid', 'cloud'];
  return modes.filter(isModeAvailable);
}

/**
 * Validate API key format (basic validation)
 */
export function validateApiKey(provider: 'gemini' | 'openai', key: string): boolean {
  if (!key || key.length < 10) return false;
  
  if (provider === 'gemini') {
    // Gemini API keys typically start with 'AI'
    return key.startsWith('AI') && key.length >= 39;
  }
  
  if (provider === 'openai') {
    // OpenAI API keys start with 'sk-'
    return key.startsWith('sk-') && key.length >= 40;
  }
  
  return false;
}
