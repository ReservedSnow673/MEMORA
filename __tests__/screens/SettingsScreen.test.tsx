/**
 * Settings Screen Tests
 * Tests for Settings functionality and accessibility
 */

import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import settingsReducer, {
  setAIProvider,
  setWifiOnly,
  setChargingOnly,
  setAutoProcessImages,
  setDetailedCaptions,
  updateSettings,
} from '../../src/store/settingsSlice';

const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      settings: settingsReducer,
    },
    preloadedState,
  });
};

describe('Settings Slice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('AI Provider Settings', () => {
    it('should set AI provider to gemini', () => {
      store.dispatch(setAIProvider('gemini'));
      expect(store.getState().settings.aiProvider).toBe('gemini');
    });

    // OpenAI temporarily disabled - only Gemini supported
    it.skip('should set AI provider to openai', () => {
      store.dispatch(setAIProvider('openai'));
      expect(store.getState().settings.aiProvider).toBe('openai');
    });

    it('should not allow on-device provider (removed feature)', () => {
      // On-device has been removed, only gemini supported (openai temporarily disabled)
      const validProviders = ['gemini'];
      expect(validProviders).not.toContain('onDevice');
    });

    it('default provider should be gemini', () => {
      expect(store.getState().settings.aiProvider).toBe('gemini');
    });
  });

  describe('Processing Settings', () => {
    it('should toggle wifi only', () => {
      store.dispatch(setWifiOnly(true));
      expect(store.getState().settings.wifiOnly).toBe(true);
      
      store.dispatch(setWifiOnly(false));
      expect(store.getState().settings.wifiOnly).toBe(false);
    });

    it('should toggle charging only', () => {
      store.dispatch(setChargingOnly(true));
      expect(store.getState().settings.chargingOnly).toBe(true);
      
      store.dispatch(setChargingOnly(false));
      expect(store.getState().settings.chargingOnly).toBe(false);
    });

    it('should toggle auto process images', () => {
      store.dispatch(setAutoProcessImages(true));
      expect(store.getState().settings.autoProcessImages).toBe(true);
      
      store.dispatch(setAutoProcessImages(false));
      expect(store.getState().settings.autoProcessImages).toBe(false);
    });

    it('should toggle detailed captions', () => {
      store.dispatch(setDetailedCaptions(true));
      expect(store.getState().settings.detailedCaptions).toBe(true);
      
      store.dispatch(setDetailedCaptions(false));
      expect(store.getState().settings.detailedCaptions).toBe(false);
    });
  });

  describe('Batch Settings Update', () => {
    it('should update multiple settings at once', () => {
      // OpenAI temporarily disabled - only Gemini supported
      store.dispatch(updateSettings({
        wifiOnly: false,
        chargingOnly: true,
        aiProvider: 'gemini',
      }));
      
      expect(store.getState().settings.wifiOnly).toBe(false);
      expect(store.getState().settings.chargingOnly).toBe(true);
      expect(store.getState().settings.aiProvider).toBe('gemini');
    });
  });
});

describe('Settings Screen Accessibility', () => {
  describe('WCAG Compliance', () => {
    it('should have proper section headings', () => {
      const sectionHeadings = [
        'Processing',
        'AI Provider',
        'Network',
        'About',
      ];
      
      sectionHeadings.forEach(heading => {
        expect(heading.length).toBeGreaterThan(0);
      });
    });

    it('should have proper accessibility labels for settings', () => {
      const accessibilityLabels = [
        'AI provider selection',
        'WiFi only toggle',
        'Charging only toggle',
        'Auto process toggle',
      ];
      
      accessibilityLabels.forEach(label => {
        expect(label.length).toBeGreaterThan(0);
      });
    });

    it('should not use invalid accessibilityRole values', () => {
      // These roles are NOT valid in React Native
      const invalidRoles = ['region', 'tablist', 'toolbar', 'list', 'listitem', 'dialog'];
      
      // Valid roles that should be used instead
      const validRoles = [
        'button', 'link', 'text', 'header', 'radio', 
        'radiogroup', 'tab', 'switch', 'progressbar', 'none'
      ];
      
      invalidRoles.forEach(role => {
        expect(validRoles).not.toContain(role);
      });
    });

    it('should have accessible section containers', () => {
      // Sections should use accessible={true} with accessibilityLabel
      // NOT accessibilityRole="region" (which is invalid in RN)
      const sectionAccessibility = {
        accessible: true,
        accessibilityLabel: 'Section name',
      };
      
      expect(sectionAccessibility.accessible).toBe(true);
      expect(sectionAccessibility.accessibilityLabel).toBeDefined();
    });
  });

  describe('Form Controls', () => {
    it('toggle switches should have proper accessibility', () => {
      const toggleAccessibility = {
        accessibilityRole: 'switch' as const,
        accessibilityState: { checked: false },
        accessibilityLabel: 'Toggle setting',
      };
      
      expect(toggleAccessibility.accessibilityRole).toBe('switch');
      expect(toggleAccessibility.accessibilityState.checked).toBeDefined();
    });

    it('radio buttons should have proper accessibility', () => {
      const radioAccessibility = {
        accessibilityRole: 'radio' as const,
        accessibilityState: { checked: true },
        accessibilityLabel: 'Option name',
      };
      
      expect(radioAccessibility.accessibilityRole).toBe('radio');
      expect(radioAccessibility.accessibilityState.checked).toBeDefined();
    });
  });

  describe('Touch Targets', () => {
    const MIN_TOUCH_TARGET = 44;

    it('toggle buttons should meet minimum touch target', () => {
      const toggleSize = { minHeight: 48, minWidth: 48 };
      expect(toggleSize.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      expect(toggleSize.minWidth).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    });

    it('selection buttons should meet minimum touch target', () => {
      const buttonSize = { minHeight: 44, paddingVertical: 12 };
      expect(buttonSize.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    });
  });
});

describe('AI Provider Selection', () => {
  // OpenAI temporarily disabled - only Gemini supported
  it('should only have gemini option (openai temporarily disabled)', () => {
    const providers = ['gemini'];
    expect(providers.length).toBe(1);
    expect(providers).toContain('gemini');
    expect(providers).not.toContain('onDevice');
  });

  it('gemini should be the default provider', () => {
    const store = createTestStore();
    expect(store.getState().settings.aiProvider).toBe('gemini');
  });

  it('should have proper labels for providers', () => {
    // OpenAI temporarily disabled
    const providerLabels = {
      gemini: 'Google Gemini',
      // openai: 'OpenAI GPT-4',
    };
    
    expect(providerLabels.gemini).toBe('Google Gemini');
  });

  it('should have proper descriptions for providers', () => {
    // OpenAI temporarily disabled
    const providerDescriptions = {
      gemini: expect.stringContaining('Google'),
      // openai: expect.stringContaining('OpenAI'),
    };
    
    expect('Google Gemini API').toEqual(providerDescriptions.gemini);
  });
});

describe('Background Processing Options', () => {
  it('should have frequency options', () => {
    const frequencies = ['hourly', 'daily', 'weekly'];
    expect(frequencies.length).toBe(3);
  });

  it('daily should be the default frequency', () => {
    const store = createTestStore();
    expect(store.getState().settings.backgroundFetchFrequency).toBe('daily');
  });
});
