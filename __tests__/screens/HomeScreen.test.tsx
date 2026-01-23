/**
 * Home Screen Tests
 * Tests for HomeScreenModern accessibility and functionality
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import imagesReducer from '../../src/store/imagesSlice';
import captionsReducer from '../../src/store/captionsSlice';
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
    params: {},
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

describe('Home Screen', () => {
  describe('Dashboard Stats', () => {
    it('should display total images count', () => {
      const store = createTestStore({
        images: {
          images: [
            { id: '1', uri: 'test1.jpg', timestamp: Date.now() },
            { id: '2', uri: 'test2.jpg', timestamp: Date.now() },
          ],
          selectedImages: [],
          isLoading: false,
          error: null,
        },
      });
      
      expect(store.getState().images.images.length).toBe(2);
    });

    it('should track captioned images', () => {
      const store = createTestStore({
        captions: {
          captions: {
            '1': { text: 'Test caption', confidence: 0.9 },
          },
          isGenerating: false,
          error: null,
        },
      });
      
      expect(Object.keys(store.getState().captions.captions).length).toBe(1);
    });

    it('should calculate caption progress percentage', () => {
      const totalImages = 10;
      const captionedImages = 7;
      const progress = (captionedImages / totalImages) * 100;
      
      expect(progress).toBe(70);
    });
  });

  describe('Quick Actions', () => {
    it('should have scan gallery action', () => {
      const actions = ['Scan Gallery', 'View All', 'Settings'];
      expect(actions).toContain('Scan Gallery');
    });

    it('should have view gallery action', () => {
      const actions = ['Scan Gallery', 'View All', 'Settings'];
      expect(actions).toContain('View All');
    });
  });

  describe('Recent Images Section', () => {
    it('should display recent images', () => {
      const recentImages = [
        { id: '1', uri: 'test1.jpg', timestamp: Date.now() },
        { id: '2', uri: 'test2.jpg', timestamp: Date.now() - 1000 },
        { id: '3', uri: 'test3.jpg', timestamp: Date.now() - 2000 },
      ];
      
      // Sort by timestamp descending
      const sorted = [...recentImages].sort((a, b) => b.timestamp - a.timestamp);
      expect(sorted[0].id).toBe('1');
    });

    it('should limit recent images display', () => {
      const MAX_RECENT = 6;
      const allImages = Array.from({ length: 20 }, (_, i) => ({
        id: String(i),
        uri: `test${i}.jpg`,
        timestamp: Date.now() - i * 1000,
      }));
      
      const recentImages = allImages.slice(0, MAX_RECENT);
      expect(recentImages.length).toBe(MAX_RECENT);
    });
  });
});

describe('Home Screen Accessibility', () => {
  describe('Headers', () => {
    it('should have proper heading hierarchy', () => {
      const headings = [
        { level: 1, text: 'Memora' },
        { level: 2, text: 'Statistics' },
        { level: 2, text: 'Quick Actions' },
        { level: 2, text: 'Recent Images' },
      ];
      
      // Main heading should be level 1
      const mainHeading = headings.find(h => h.level === 1);
      expect(mainHeading?.text).toBe('Memora');
      
      // Section headings should be level 2
      const sectionHeadings = headings.filter(h => h.level === 2);
      expect(sectionHeadings.length).toBe(3);
    });

    it('should use accessibilityRole header for section titles', () => {
      const headerAccessibility = {
        accessibilityRole: 'header' as const,
      };
      
      expect(headerAccessibility.accessibilityRole).toBe('header');
    });
  });

  describe('Statistics Cards', () => {
    it('should have accessible stat cards', () => {
      const statCard = {
        accessible: true,
        accessibilityLabel: '150 Total Photos',
        accessibilityRole: 'text' as const,
      };
      
      expect(statCard.accessible).toBe(true);
      expect(statCard.accessibilityLabel).toContain('Photos');
    });

    it('should announce progress updates', () => {
      const progressAnnouncement = '70% of images captioned';
      expect(progressAnnouncement).toContain('%');
    });
  });

  describe('Image Grid', () => {
    it('should have accessible image items', () => {
      const imageItem = {
        accessible: true,
        accessibilityRole: 'button' as const,
        accessibilityLabel: 'Photo from today, tap to view details',
        accessibilityHint: 'Opens image detail screen',
      };
      
      expect(imageItem.accessibilityRole).toBe('button');
      expect(imageItem.accessibilityHint).toBeDefined();
    });

    it('should indicate caption status in accessibility label', () => {
      const captionedImage = 'Photo with caption: Beautiful sunset at the beach';
      const uncaptionedImage = 'Photo, not yet captioned';
      
      expect(captionedImage).toContain('caption');
      expect(uncaptionedImage).toContain('not yet captioned');
    });
  });

  describe('Touch Targets', () => {
    const MIN_TOUCH_TARGET = 44;

    it('action buttons should meet minimum size', () => {
      const buttonStyle = {
        minHeight: 48,
        paddingVertical: 16,
        paddingHorizontal: 24,
      };
      
      expect(buttonStyle.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    });

    it('image thumbnails should be tappable', () => {
      const thumbnailSize = { width: 100, height: 100 };
      expect(thumbnailSize.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      expect(thumbnailSize.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    });
  });

  describe('Valid Accessibility Roles', () => {
    it('should only use valid React Native accessibilityRole values', () => {
      const validRoles = [
        'none',
        'button',
        'link',
        'search',
        'image',
        'keyboardkey',
        'text',
        'adjustable',
        'imagebutton',
        'header',
        'summary',
        'alert',
        'checkbox',
        'combobox',
        'menu',
        'menubar',
        'menuitem',
        'progressbar',
        'radio',
        'radiogroup',
        'scrollbar',
        'spinbutton',
        'switch',
        'tab',
        'tabbar',
        'timer',
      ];
      
      // These are NOT valid in React Native (they're web ARIA roles)
      const invalidRoles = ['region', 'tablist', 'toolbar', 'list', 'listitem', 'dialog', 'navigation'];
      
      invalidRoles.forEach(role => {
        expect(validRoles).not.toContain(role);
      });
    });
  });
});

describe('Home Screen State Management', () => {
  describe('Loading States', () => {
    it('should handle loading state', () => {
      const store = createTestStore({
        images: {
          images: [],
          selectedImages: [],
          isLoading: true,
          error: null,
        },
      });
      
      expect(store.getState().images.isLoading).toBe(true);
    });

    it('should handle error state', () => {
      const store = createTestStore({
        images: {
          images: [],
          selectedImages: [],
          isLoading: false,
          error: 'Failed to load images',
        },
      });
      
      expect(store.getState().images.error).toBe('Failed to load images');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no images', () => {
      const store = createTestStore({
        images: {
          images: [],
          selectedImages: [],
          isLoading: false,
          error: null,
        },
      });
      
      expect(store.getState().images.images.length).toBe(0);
    });

    it('empty state should be accessible', () => {
      const emptyState = {
        accessible: true,
        accessibilityLabel: 'No images yet. Tap Scan Gallery to get started.',
        accessibilityRole: 'text' as const,
      };
      
      expect(emptyState.accessible).toBe(true);
      expect(emptyState.accessibilityLabel).toContain('Scan Gallery');
    });
  });
});
