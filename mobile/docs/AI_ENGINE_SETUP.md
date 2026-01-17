# AI Engine Setup Guide

This guide explains how to set up and configure the AI captioning engines in Memora.

## Overview

Memora supports three AI backends for image captioning:

1. **On-Device (TFLite)** - Local inference, no internet required
2. **Gemini** - Google's multimodal AI via cloud API
3. **GPT-5.2** - OpenAI's premium vision model via cloud API

## Quick Start

### 1. On-Device Captioning (Recommended for Privacy)

On-device captioning uses TensorFlow Lite models that run locally on the device.

#### Downloading the Model

1. Download a compatible image captioning model (BLIP recommended):
   - [BLIP Image Captioning Base (TFLite)](https://tfhub.dev/salesforce/blip-image-captioning-base/1)
   - Or use a quantized version for faster inference

2. Place the model file in your app's assets:
   ```
   mobile/assets/models/blip-image-captioning-base.tflite
   ```

3. Update `app.json` to include the model:
   ```json
   {
     "expo": {
       "assetBundlePatterns": [
         "assets/models/*"
       ]
     }
   }
   ```

#### Alternative: Download at Runtime

For smaller app size, download the model on first launch:

```typescript
import * as FileSystem from 'expo-file-system';

const MODEL_URL = 'https://your-cdn.com/blip-image-captioning-base.tflite';
const MODEL_PATH = `${FileSystem.cacheDirectory}blip-image-captioning-base.tflite`;

async function downloadModel() {
  const info = await FileSystem.getInfoAsync(MODEL_PATH);
  if (!info.exists) {
    await FileSystem.downloadAsync(MODEL_URL, MODEL_PATH);
  }
  return MODEL_PATH;
}
```

### 2. Gemini API Setup

1. Get an API key from [Google AI Studio](https://aistudio.google.com/apikey)

2. Add to your environment configuration:
   ```
   GEMINI_API_KEY=AIzaSy...your-key-here
   ```

3. Configure in `app.json`:
   ```json
   {
     "expo": {
       "extra": {
         "geminiApiKey": "${GEMINI_API_KEY}"
       }
     }
   }
   ```

### 3. OpenAI GPT-5.2 Setup

1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)

2. Add to your environment configuration:
   ```
   OPENAI_API_KEY=sk-...your-key-here
   ```

3. Configure in `app.json`:
   ```json
   {
     "expo": {
       "extra": {
         "openaiApiKey": "${OPENAI_API_KEY}"
       }
     }
   }
   ```

## Configuration Options

### AiEngineConfig

```typescript
interface AiEngineConfig {
  // AI mode: 'on-device' | 'gemini' | 'gpt-5.2' | 'hybrid' | 'cloud'
  mode: AiMode;
  
  // Maximum retry attempts for failed requests
  maxRetries: number; // default: 3
  
  // Request timeout in milliseconds
  timeoutMs: number; // default: 30000
  
  // Path to TFLite model file
  tfliteModelPath?: string;
  
  // API keys
  geminiApiKey?: string;
  openaiApiKey?: string;
  
  // Maximum image dimension (pixels) - larger images are resized
  maxImageDimension?: number; // default: 1024
  
  // JPEG quality for image compression (0-100)
  imageQuality?: number; // default: 80
}
```

### Mode Descriptions

| Mode | Description | Internet Required | Fallback |
|------|-------------|-------------------|----------|
| `on-device` | Local TFLite inference only | No | None |
| `gemini` | Gemini API only | Yes | None |
| `gpt-5.2` | OpenAI GPT-5.2 only | Yes | None |
| `hybrid` | On-device first, cloud fallback | Optional | Yes |
| `cloud` | OpenAI first, Gemini fallback | Yes | Yes |

## Usage Example

```typescript
import AiCaptionEngine from './services/aiEngine';
import { getConfigForMode } from './config/aiConfig';

// Initialize with desired mode
const config = getConfigForMode('hybrid');
const engine = new AiCaptionEngine({
  ...config,
  geminiApiKey: 'your-api-key',
});

await engine.initialize();

// Generate caption
const result = await engine.generateCaption('file:///path/to/image.jpg');
console.log(result.caption); // "A golden retriever playing in a sunny park"
console.log(result.model);   // "blip-base-tflite" or "gemini-2.5-flash"
```

## API Pricing

### Gemini API
- Free tier: 15 RPM (requests per minute), 1M TPM (tokens per minute)
- See [Gemini Pricing](https://ai.google.dev/gemini-api/docs/pricing)

### OpenAI GPT-5.2
- Pay-per-token pricing
- See [OpenAI Pricing](https://openai.com/api/pricing/)

## Troubleshooting

### "TFLite model not loaded"
- Ensure the model file exists in the correct location
- Check that the model path in config matches the actual file

### "Gemini API error: Invalid API key"
- Verify your API key is correct
- Ensure the Gemini API is enabled in Google Cloud Console

### "Rate limit exceeded"
- Reduce caption generation frequency
- Consider upgrading your API tier
- Implement request queuing with backoff

### "Content blocked by safety filters"
- The image may contain content that triggers safety filters
- Try a different image or adjust safety settings

## Security Best Practices

1. **Never commit API keys to version control**
2. Use environment variables or a secrets manager
3. Consider using a backend proxy for API calls in production
4. Implement rate limiting on the client side
5. Monitor API usage for unusual patterns

## Model Recommendations

### For On-Device:
- **BLIP Base (Quantized)**: Good balance of quality and speed
- **BLIP Large (Quantized)**: Higher quality, slower inference
- Model size: ~200MB (base), ~400MB (large)

### For Cloud:
- **Gemini 2.5 Flash**: Fast, cost-effective, good quality
- **GPT-5.2**: Premium quality, higher cost
