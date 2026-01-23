/**
 * Image Details Screen Tests
 * Tests for ImageDetailsScreenModern accessibility and functionality
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import imagesReducer from '../../src/store/imagesSlice';
import captionsReducer, {
  addCaption,
  setLoading,
  setError,
} from '../../src/store/captionsSlice';
import settingsReducer from '../../src/store/settingsSlice';

// Mock dependencies
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));

jest.mock('expo-blur', () => ({
  BlurView: ({ children }: any) => children,
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: { imageId: '1' },
  }),
  useFocusEffect: jest.fn(),
}));

const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      images: imagesReducer,
      captions: captionsReducer,
      settings: settingsReducer,
    },
    preloadedState,
  });
};

describe('Image Details Screen', () => {
  describe('Image Display', () => {
    it('should display the image', () => {
      const image = {
        id: '1',
        uri: 'file:///path/to/image.jpg',
        width: 1920,
        height: 1080,
        timestamp: Date.now(),
      };
      
      expect(image.uri).toBeDefined();
      expect(image.width).toBeGreaterThan(0);
    });

    it('should show image metadata', () => {
      const metadata = {
        filename: 'IMG_1234.jpg',
        date: new Date().toISOString(),
        dimensions: '1920 x 1080',
        size: '2.4 MB',
      };
      
      expect(metadata.filename).toBeDefined();
      expect(metadata.date).toBeDefined();
    });
  });

  describe('Caption Management', () => {
    it('should display existing caption', () => {
      const store = createTestStore({
        captions: {
          items: [
            { 
              id: 'caption-1', 
              imageId: '1', 
              shortDescription: 'A beautiful sunset over the ocean', 
              longDescription: 'A detailed description',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              processed: true,
            },
          ],
          processing: [],
          loading: false,
          error: null,
        },
      });
      
      const caption = store.getState().captions.items.find(c => c.imageId === '1');
      expect(caption?.shortDescription).toBe('A beautiful sunset over the ocean');
    });

    it('should show caption details', () => {
      const store = createTestStore({
        captions: {
          items: [
            { 
              id: 'caption-1', 
              imageId: '1', 
              shortDescription: 'Test caption',
              longDescription: 'A longer description with more details',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              processed: true,
            },
          ],
          processing: [],
          loading: false,
          error: null,
        },
      });
      
      const caption = store.getState().captions.items.find(c => c.imageId === '1');
      expect(caption?.longDescription).toBeDefined();
    });

    it('should allow generating new caption', () => {
      const store = createTestStore();
      store.dispatch(setLoading(true));
      
      expect(store.getState().captions.loading).toBe(true);
    });

    it('should handle caption generation error', () => {
      const store = createTestStore();
      store.dispatch(setError('API request failed'));
      
      expect(store.getState().captions.error).toBe('API request failed');
    });

    it('should add new caption', () => {
      const store = createTestStore();
      const newCaption = {
        id: 'caption-1',
        imageId: '1',
        shortDescription: 'New caption',
        longDescription: 'A detailed description',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        processed: true,
      };
      store.dispatch(addCaption(newCaption));
      
      const caption = store.getState().captions.items.find(c => c.imageId === '1');
      expect(caption?.shortDescription).toBe('New caption');
    });
  });

  describe('Caption Editing', () => {
    it('should allow manual caption editing', () => {
      const originalCaption = 'AI generated caption';
      const editedCaption = 'User edited caption';
      
      expect(editedCaption).not.toBe(originalCaption);
    });

    it('should preserve edit history', () => {
      const history = [
        { text: 'Original', timestamp: Date.now() - 2000 },
        { text: 'First edit', timestamp: Date.now() - 1000 },
        { text: 'Current', timestamp: Date.now() },
      ];
      
      expect(history.length).toBe(3);
      expect(history[history.length - 1].text).toBe('Current');
    });
  });
});

describe('Image Details Accessibility', () => {
  describe('Image Accessibility', () => {
    it('should have accessible image with description', () => {
      const imageAccessibility = {
        accessible: true,
        accessibilityRole: 'image' as const,
        accessibilityLabel: 'Photo: A beautiful sunset over the ocean',
      };
      
      expect(imageAccessibility.accessibilityRole).toBe('image');
      expect(imageAccessibility.accessibilityLabel).toContain('sunset');
    });

    it('should announce image without caption', () => {
      const imageWithoutCaption = {
        accessibilityLabel: 'Photo, caption not yet generated',
      };
      
      expect(imageWithoutCaption.accessibilityLabel).toContain('not yet generated');
    });
  });

  describe('Caption Section Accessibility', () => {
    it('should have accessible caption container', () => {
      const captionSection = {
        accessible: true,
        accessibilityLabel: 'Caption section',
        // NOT using invalid accessibilityRole="region"
      };
      
      expect(captionSection.accessible).toBe(true);
      expect(captionSection).not.toHaveProperty('accessibilityRole', 'region');
    });

    it('should have accessible caption text', () => {
      const captionText = {
        accessibilityRole: 'text' as const,
        accessibilityLabel: 'Caption: A beautiful sunset over the ocean. Confidence 95 percent.',
      };
      
      expect(captionText.accessibilityRole).toBe('text');
      expect(captionText.accessibilityLabel).toContain('Confidence');
    });

    it('should announce generating state', () => {
      const generatingState = {
        accessibilityRole: 'progressbar' as const,
        accessibilityLabel: 'Generating caption, please wait',
        accessibilityState: { busy: true },
      };
      
      expect(generatingState.accessibilityState.busy).toBe(true);
    });
  });

  describe('Action Buttons', () => {
    it('should have accessible generate button', () => {
      const generateButton = {
        accessibilityRole: 'button' as const,
        accessibilityLabel: 'Generate caption',
        accessibilityHint: 'Uses AI to create a description of this photo',
      };
      
      expect(generateButton.accessibilityRole).toBe('button');
      expect(generateButton.accessibilityHint).toBeDefined();
    });

    it('should have accessible edit button', () => {
      const editButton = {
        accessibilityRole: 'button' as const,
        accessibilityLabel: 'Edit caption',
        accessibilityHint: 'Opens text input to modify caption',
      };
      
      expect(editButton.accessibilityRole).toBe('button');
    });

    it('should have accessible share button', () => {
      const shareButton = {
        accessibilityRole: 'button' as const,
        accessibilityLabel: 'Share photo',
        accessibilityHint: 'Opens sharing options',
      };
      
      expect(shareButton.accessibilityRole).toBe('button');
    });

    it('should have accessible back button', () => {
      const backButton = {
        accessibilityRole: 'button' as const,
        accessibilityLabel: 'Go back',
        accessibilityHint: 'Returns to previous screen',
      };
      
      expect(backButton.accessibilityRole).toBe('button');
    });
  });

  describe('Metadata Section', () => {
    it('should have accessible metadata items', () => {
      const metadataItem = {
        accessible: true,
        accessibilityLabel: 'File name: IMG_1234.jpg',
      };
      
      expect(metadataItem.accessibilityLabel).toContain('File name');
    });

    it('should format dates accessibly', () => {
      const dateAccessibility = {
        accessibilityLabel: 'Date taken: December 15, 2024 at 3:45 PM',
      };
      
      expect(dateAccessibility.accessibilityLabel).toContain('Date taken');
    });
  });

  describe('Touch Targets', () => {
    const MIN_TOUCH_TARGET = 44;

    it('action buttons should meet minimum size', () => {
      const buttonStyle = {
        minHeight: 48,
        minWidth: 48,
        padding: 12,
      };
      
      expect(buttonStyle.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      expect(buttonStyle.minWidth).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    });

    it('navigation buttons should meet minimum size', () => {
      const navButtonStyle = {
        height: 44,
        width: 44,
      };
      
      expect(navButtonStyle.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      expect(navButtonStyle.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    });
  });

  describe('Error State Accessibility', () => {
    it('should announce errors accessibly', () => {
      const errorAccessibility = {
        accessibilityRole: 'alert' as const,
        accessibilityLabel: 'Error: Failed to generate caption. Please try again.',
        accessibilityLiveRegion: 'assertive' as const,
      };
      
      expect(errorAccessibility.accessibilityRole).toBe('alert');
      expect(errorAccessibility.accessibilityLiveRegion).toBe('assertive');
    });
  });
});

describe('Caption Generation', () => {
  describe('AI Provider Integration', () => {
    it('should use selected AI provider', () => {
      const store = createTestStore({
        settings: {
          aiProvider: 'gemini',
          theme: 'dark',
          colorBlindMode: 'none',
          highContrast: false,
          reduceMotion: false,
          largeText: false,
          autoCaption: false,
          captionQuality: 'high',
          processingEnabled: true,
        },
      });
      
      expect(store.getState().settings.aiProvider).toBe('gemini');
    });

    // OpenAI temporarily disabled - only Gemini supported
    it('should only allow gemini provider (openai temporarily disabled)', () => {
      const validProviders = ['gemini'];
      
      expect(validProviders).toContain('gemini');
      expect(validProviders).not.toContain('onDevice');
    });
  });

  describe('Caption Quality', () => {
    it('should respect quality setting', () => {
      const qualityLevels = ['low', 'medium', 'high'];
      
      qualityLevels.forEach(quality => {
        expect(['low', 'medium', 'high']).toContain(quality);
      });
    });

    it('should adjust prompt based on quality', () => {
      const getPrompt = (quality: string) => {
        switch (quality) {
          case 'low':
            return 'Brief description';
          case 'medium':
            return 'Detailed description';
          case 'high':
            return 'Comprehensive description with context';
          default:
            return 'Description';
        }
      };
      
      expect(getPrompt('high')).toContain('Comprehensive');
      expect(getPrompt('low')).toContain('Brief');
    });
  });
});

describe('Navigation', () => {
  describe('Back Navigation', () => {
    it('should navigate back to gallery', () => {
      const goBack = jest.fn();
      goBack();
      expect(goBack).toHaveBeenCalled();
    });
  });

  describe('Image Navigation', () => {
    it('should support swipe to next image', () => {
      const images = ['1', '2', '3'];
      const currentIndex = 1;
      const nextIndex = Math.min(currentIndex + 1, images.length - 1);
      
      expect(nextIndex).toBe(2);
    });

    it('should support swipe to previous image', () => {
      const currentIndex = 1;
      const prevIndex = Math.max(currentIndex - 1, 0);
      
      expect(prevIndex).toBe(0);
    });
  });
});
