/**
 * Centralized API Key Management
 * 
 * Single source of truth for all API keys in the app.
 * Keys are loaded from .env on app startup and stored in Redux.
 * All services should use getApiKeys() to access keys.
 * 
 * NOTE: OpenAI temporarily disabled - only Gemini supported
 */

// OpenAI temporarily disabled - only Gemini supported
// import { OPENAI_API_KEY, GEMINI_API_KEY } from '@env';
import { GEMINI_API_KEY } from '@env';
import { store } from '../store';
import { updateSettings } from '../store/settingsSlice';

/**
 * Validate if an API key looks real (not a placeholder)
 */
function isValidApiKey(key: string | undefined): boolean {
  if (!key) return false;
  if (key.includes('your-') || key.includes('placeholder') || key === '') return false;
  return key.length >= 20;
}

// Environment variables from .env (validated)
// OpenAI temporarily disabled
// const ENV_OPENAI_API_KEY = isValidApiKey(OPENAI_API_KEY) ? OPENAI_API_KEY : undefined;
const ENV_GEMINI_API_KEY = isValidApiKey(GEMINI_API_KEY) ? GEMINI_API_KEY : undefined;

/**
 * Initialize API keys from .env into Redux store
 * Call this once on app startup (e.g., in App.tsx)
 * 
 * This ensures .env keys are available through Redux settings,
 * but won't overwrite user-entered keys.
 */
export function initializeApiKeys(): void {
  const state = store.getState();
  const currentSettings = state.settings;
  
  const updates: Record<string, string> = {};
  
  // OpenAI temporarily disabled
  // if (!currentSettings.openAIApiKey && ENV_OPENAI_API_KEY) {
  //   updates.openAIApiKey = ENV_OPENAI_API_KEY;
  //   console.log('[ApiKeys] Loaded OpenAI key from .env');
  // }
  
  if (!currentSettings.geminiApiKey && ENV_GEMINI_API_KEY) {
    updates.geminiApiKey = ENV_GEMINI_API_KEY;
    console.log('[ApiKeys] Loaded Gemini key from .env');
  }
  
  if (Object.keys(updates).length > 0) {
    store.dispatch(updateSettings(updates));
  }
}

/**
 * Get current API keys from the single source of truth (Redux store)
 * Falls back to .env if Redux doesn't have keys yet
 * 
 * NOTE: openaiApiKey kept in return type for backward compatibility
 */
export function getApiKeys(): { openaiApiKey?: string; geminiApiKey?: string } {
  const state = store.getState();
  const settings = state.settings;
  
  const result = {
    // OpenAI temporarily disabled
    // openaiApiKey: settings.openAIApiKey || ENV_OPENAI_API_KEY,
    openaiApiKey: undefined,
    geminiApiKey: settings.geminiApiKey || ENV_GEMINI_API_KEY,
  };
  
  // Debug: Log what we're returning
  console.log('[ApiKeys] getApiKeys called:', {
    // OpenAI temporarily disabled
    // reduxOpenAI: settings.openAIApiKey ? 'SET (' + settings.openAIApiKey.substring(0, 10) + '...)' : 'NOT SET',
    reduxGemini: settings.geminiApiKey ? 'SET (' + settings.geminiApiKey.substring(0, 10) + '...)' : 'NOT SET',
    // envOpenAI: ENV_OPENAI_API_KEY ? 'SET (' + ENV_OPENAI_API_KEY.substring(0, 10) + '...)' : 'NOT SET',
    envGemini: ENV_GEMINI_API_KEY ? 'SET (' + ENV_GEMINI_API_KEY.substring(0, 10) + '...)' : 'NOT SET',
    // resultOpenAI: result.openaiApiKey ? 'SET' : 'NOT SET',
    resultGemini: result.geminiApiKey ? 'SET' : 'NOT SET',
  });
  
  return result;
}

/**
 * Check if we have valid API keys available
 */
export function hasValidApiKeys(): { openai: boolean; gemini: boolean } {
  const keys = getApiKeys();
  return {
    // OpenAI temporarily disabled
    openai: false, // isValidApiKey(keys.openaiApiKey),
    gemini: isValidApiKey(keys.geminiApiKey),
  };
}

/**
 * Get the .env keys directly (for debugging or initial setup)
 * NOTE: OpenAI temporarily disabled
 */
export function getEnvApiKeys(): { openaiApiKey?: string; geminiApiKey?: string } {
  return {
    // OpenAI temporarily disabled
    // openaiApiKey: ENV_OPENAI_API_KEY,
    openaiApiKey: undefined,
    geminiApiKey: ENV_GEMINI_API_KEY,
  };
}
