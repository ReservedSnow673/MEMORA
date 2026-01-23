import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { store } from '../store';
import { 
  addToProcessingQueue, 
  removeFromProcessingQueue, 
  setIsProcessing,
  updateImageStatus,
  updateImageCaption 
} from '../store/imagesSlice';
import { CaptioningService } from './captioning';

const BACKGROUND_PROCESSING_TASK = 'background-processing-task';

// Singleton CaptioningService instance to avoid creating new instances repeatedly
let captioningServiceInstance: CaptioningService | null = null;

function getCaptioningService(aiProvider?: string): CaptioningService {
  if (!captioningServiceInstance) {
    captioningServiceInstance = new CaptioningService({
      preferredProvider: aiProvider || 'gemini',
    });
  } else {
    // Update config if provider changed
    captioningServiceInstance.updateConfig({
      preferredProvider: aiProvider || 'gemini',
    });
  }
  return captioningServiceInstance;
}

// Track pending timeouts for cleanup
let pendingIntervalResetTimeout: NodeJS.Timeout | null = null;

// Define the background task
TaskManager.defineTask(BACKGROUND_PROCESSING_TASK, async () => {
  try {
    const state = store.getState();
    const { processingQueue, items: images } = state.images;
    // OpenAI temporarily disabled - only Gemini supported
    const { /* openAIApiKey, */ geminiApiKey, aiProvider } = state.settings;

    if (processingQueue.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Process one image at a time to avoid overwhelming the system
    const imageId = processingQueue[0];
    const image = images.find(img => img.id === imageId);

    if (!image) {
      store.dispatch(removeFromProcessingQueue(imageId));
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    try {
      store.dispatch(updateImageStatus({ id: imageId, status: 'processing' }));
      
      // Use singleton CaptioningService
      const captioningService = getCaptioningService(aiProvider);
      const result = await captioningService.generateCaption(image.uri);
      
      if (result.caption && !result.caption.includes('unavailable')) {
        store.dispatch(updateImageCaption({ id: imageId, caption: result.caption }));
      } else {
        store.dispatch(updateImageStatus({ id: imageId, status: 'error', error: result.error || 'Failed to process image' }));
      }
      
      store.dispatch(removeFromProcessingQueue(imageId));
      
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      console.error('Background processing error:', error);
      store.dispatch(updateImageStatus({ 
        id: imageId, 
        status: 'error', 
        error: 'Processing failed' 
      }));
      store.dispatch(removeFromProcessingQueue(imageId));
      
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  } catch (error) {
    console.error('Background task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export class BackgroundProcessingService {
  static async initialize() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_PROCESSING_TASK);
      
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_PROCESSING_TASK, {
          minimumInterval: 15 * 1000, // 15 seconds minimum interval
          stopOnTerminate: false, // Continue after app is terminated
          startOnBoot: true, // Start when device boots
        });
        console.log('Background processing task registered');
      }
    } catch (error) {
      console.error('Failed to register background task:', error);
    }
  }

  static async addImageToQueue(imageId: string) {
    try {
      store.dispatch(addToProcessingQueue(imageId));
      
      // Clear any pending timeout to prevent memory leaks
      if (pendingIntervalResetTimeout) {
        clearTimeout(pendingIntervalResetTimeout);
        pendingIntervalResetTimeout = null;
      }
      
      // Trigger background fetch to process immediately if possible
      await BackgroundFetch.setMinimumIntervalAsync(1000); // Try to process ASAP
      
      // Reset to normal interval after a short delay
      pendingIntervalResetTimeout = setTimeout(async () => {
        try {
          await BackgroundFetch.setMinimumIntervalAsync(15 * 1000);
        } catch (e) {
          console.error('Failed to reset background fetch interval:', e);
        }
        pendingIntervalResetTimeout = null;
      }, 5000);
      
    } catch (error) {
      console.error('Failed to add image to processing queue:', error);
    }
  }

  static async processImagesInForeground() {
    try {
      const state = store.getState();
      const { processingQueue, items: images } = state.images;
      // OpenAI temporarily disabled - only Gemini supported
      const { /* openAIApiKey, */ geminiApiKey, aiProvider } = state.settings;

      if (processingQueue.length === 0) {
        return;
      }

      store.dispatch(setIsProcessing(true));

      // Use singleton CaptioningService
      const captioningService = getCaptioningService(aiProvider);

      // Process images one by one
      for (const imageId of processingQueue) {
        const image = images.find(img => img.id === imageId);
        
        if (!image) {
          store.dispatch(removeFromProcessingQueue(imageId));
          continue;
        }

        try {
          store.dispatch(updateImageStatus({ id: imageId, status: 'processing' }));
          
          const result = await captioningService.generateCaption(image.uri);
          
          if (result.caption && !result.caption.includes('unavailable')) {
            store.dispatch(updateImageCaption({ id: imageId, caption: result.caption }));
          } else {
            store.dispatch(updateImageStatus({ id: imageId, status: 'error', error: result.error || 'Failed to process image' }));
          }
          
          store.dispatch(removeFromProcessingQueue(imageId));
        } catch (error) {
          console.error('Foreground processing error:', error);
          store.dispatch(updateImageStatus({ 
            id: imageId, 
            status: 'error', 
            error: 'Processing failed' 
          }));
          store.dispatch(removeFromProcessingQueue(imageId));
        }
      }

      store.dispatch(setIsProcessing(false));
    } catch (error) {
      console.error('Foreground processing error:', error);
      store.dispatch(setIsProcessing(false));
    }
  }

  static async getBackgroundFetchStatus() {
    try {
      return await BackgroundFetch.getStatusAsync();
    } catch (error) {
      console.error('Failed to get background fetch status:', error);
      return BackgroundFetch.BackgroundFetchStatus.Denied;
    }
  }
}

export default BackgroundProcessingService;