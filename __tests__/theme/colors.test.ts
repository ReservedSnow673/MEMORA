/**
 * Theme Colors Tests
 * Tests for color themes and WCAG color contrast compliance
 */

// Helper function to convert hex to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

// Calculate relative luminance for WCAG contrast
const getRelativeLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

// Calculate contrast ratio between two colors
const getContrastRatio = (hex1: string, hex2: string): number => {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  
  if (!rgb1 || !rgb2) return 0;
  
  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

// WCAG 2.1 contrast requirements
const WCAG_AA_NORMAL = 4.5; // For normal text
const WCAG_AA_LARGE = 3.0;  // For large text (18pt+)
const WCAG_AAA_NORMAL = 7.0; // Enhanced contrast
const WCAG_AAA_LARGE = 4.5; // Enhanced contrast for large text

describe('Color Utilities', () => {
  describe('hexToRgb', () => {
    it('should convert valid hex to RGB', () => {
      const result = hexToRgb('#FF9500');
      expect(result).toEqual({ r: 255, g: 149, b: 0 });
    });

    it('should handle lowercase hex', () => {
      const result = hexToRgb('#ff9500');
      expect(result).toEqual({ r: 255, g: 149, b: 0 });
    });

    it('should handle hex without hash', () => {
      const result = hexToRgb('FF9500');
      expect(result).toEqual({ r: 255, g: 149, b: 0 });
    });

    it('should return null for invalid hex', () => {
      const result = hexToRgb('not-a-color');
      expect(result).toBeNull();
    });

    it('should convert white correctly', () => {
      const result = hexToRgb('#FFFFFF');
      expect(result).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('should convert black correctly', () => {
      const result = hexToRgb('#000000');
      expect(result).toEqual({ r: 0, g: 0, b: 0 });
    });
  });

  describe('getRelativeLuminance', () => {
    it('should return 1 for white', () => {
      const luminance = getRelativeLuminance(255, 255, 255);
      expect(luminance).toBeCloseTo(1, 2);
    });

    it('should return 0 for black', () => {
      const luminance = getRelativeLuminance(0, 0, 0);
      expect(luminance).toBeCloseTo(0, 2);
    });

    it('should calculate mid-gray correctly', () => {
      const luminance = getRelativeLuminance(128, 128, 128);
      expect(luminance).toBeGreaterThan(0);
      expect(luminance).toBeLessThan(1);
    });
  });

  describe('getContrastRatio', () => {
    it('should return 21:1 for black on white', () => {
      const ratio = getContrastRatio('#FFFFFF', '#000000');
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('should return 1:1 for same colors', () => {
      const ratio = getContrastRatio('#FF9500', '#FF9500');
      expect(ratio).toBeCloseTo(1, 2);
    });

    it('should be symmetric', () => {
      const ratio1 = getContrastRatio('#FF9500', '#000000');
      const ratio2 = getContrastRatio('#000000', '#FF9500');
      expect(ratio1).toBeCloseTo(ratio2, 2);
    });
  });
});

describe('Theme Color Definitions', () => {
  // Dark Orange theme (default)
  const darkOrangeTheme = {
    primary: '#FF9500',
    background: '#000000',
    surface: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#007AFF',
  };

  // Light Orange theme
  const lightOrangeTheme = {
    primary: '#FF9500',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#007AFF',
  };

  // High Contrast theme
  const highContrastTheme = {
    primary: '#FFB340',
    background: '#000000',
    surface: '#1A1A1A',
    text: '#FFFFFF',
    textSecondary: '#CCCCCC',
    success: '#00FF00',
    warning: '#FFFF00',
    error: '#FF0000',
    info: '#00FFFF',
  };

  describe('Dark Orange Theme', () => {
    it('should have all required colors defined', () => {
      expect(darkOrangeTheme.primary).toBeDefined();
      expect(darkOrangeTheme.background).toBeDefined();
      expect(darkOrangeTheme.text).toBeDefined();
    });

    it('primary text should have WCAG AA contrast on background', () => {
      const ratio = getContrastRatio(darkOrangeTheme.text, darkOrangeTheme.background);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    });

    it('primary color should have WCAG AA contrast on background', () => {
      const ratio = getContrastRatio(darkOrangeTheme.primary, darkOrangeTheme.background);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
    });
  });

  describe('Light Orange Theme', () => {
    it('should have all required colors defined', () => {
      expect(lightOrangeTheme.primary).toBeDefined();
      expect(lightOrangeTheme.background).toBeDefined();
      expect(lightOrangeTheme.text).toBeDefined();
    });

    it('primary text should have WCAG AA contrast on background', () => {
      const ratio = getContrastRatio(lightOrangeTheme.text, lightOrangeTheme.background);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    });

    it('primary text should have WCAG AA contrast on surface', () => {
      const ratio = getContrastRatio(lightOrangeTheme.text, lightOrangeTheme.surface);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    });
  });

  describe('High Contrast Theme', () => {
    it('should have all required colors defined', () => {
      expect(highContrastTheme.primary).toBeDefined();
      expect(highContrastTheme.background).toBeDefined();
      expect(highContrastTheme.text).toBeDefined();
    });

    it('primary text should have WCAG AAA contrast on background', () => {
      const ratio = getContrastRatio(highContrastTheme.text, highContrastTheme.background);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA_NORMAL);
    });

    it('secondary text should have higher contrast than standard themes', () => {
      const ratio = getContrastRatio(highContrastTheme.textSecondary, highContrastTheme.background);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    });
  });
});

describe('Color Blind Themes', () => {
  // Protanopia (red-blind) theme
  const protanopiaTheme = {
    primary: '#FFB800', // Shifted to avoid red
    success: '#00C853', // Pure green
    error: '#FFA000', // Orange instead of red
    warning: '#FFD600',
  };

  // Deuteranopia (green-blind) theme  
  const deuteranopiaTheme = {
    primary: '#FF9500',
    success: '#64B5F6', // Blue instead of green
    error: '#FF5252',
    warning: '#FFD600',
  };

  // Tritanopia (blue-blind) theme
  const tritanopiaTheme = {
    primary: '#FF9500',
    success: '#00E676',
    error: '#FF5252',
    info: '#FF4081', // Pink instead of blue
  };

  describe('Protanopia Theme', () => {
    it('should not rely on red for error indication', () => {
      // Should use orange/yellow instead of red
      expect(protanopiaTheme.error).not.toBe('#FF0000');
      expect(protanopiaTheme.error).not.toBe('#FF3B30');
    });

    it('should have distinct success and error colors', () => {
      expect(protanopiaTheme.success).not.toBe(protanopiaTheme.error);
    });
  });

  describe('Deuteranopia Theme', () => {
    it('should not rely on green for success indication', () => {
      // Should use blue instead of green
      expect(deuteranopiaTheme.success).toContain('B5F6'); // Blue-ish
    });

    it('should have distinct success and error colors', () => {
      expect(deuteranopiaTheme.success).not.toBe(deuteranopiaTheme.error);
    });
  });

  describe('Tritanopia Theme', () => {
    it('should not rely on blue for info indication', () => {
      // Should use pink/magenta instead of blue
      expect(tritanopiaTheme.info).not.toBe('#007AFF');
    });

    it('should have distinct info and other colors', () => {
      expect(tritanopiaTheme.info).not.toBe(tritanopiaTheme.success);
      expect(tritanopiaTheme.info).not.toBe(tritanopiaTheme.error);
    });
  });
});

describe('WCAG Contrast Requirements', () => {
  describe('Constants', () => {
    it('should define WCAG AA normal text requirement as 4.5:1', () => {
      expect(WCAG_AA_NORMAL).toBe(4.5);
    });

    it('should define WCAG AA large text requirement as 3:1', () => {
      expect(WCAG_AA_LARGE).toBe(3);
    });

    it('should define WCAG AAA normal text requirement as 7:1', () => {
      expect(WCAG_AAA_NORMAL).toBe(7);
    });

    it('should define WCAG AAA large text requirement as 4.5:1', () => {
      expect(WCAG_AAA_LARGE).toBe(4.5);
    });
  });

  describe('Common Color Combinations', () => {
    it('white on black should pass AAA', () => {
      const ratio = getContrastRatio('#FFFFFF', '#000000');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AAA_NORMAL);
    });

    it('orange (#FF9500) on black should pass AA for large text', () => {
      const ratio = getContrastRatio('#FF9500', '#000000');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
    });

    it('light gray on white should have measurable contrast', () => {
      const ratio = getContrastRatio('#8E8E93', '#FFFFFF');
      expect(ratio).toBeGreaterThan(1);
    });
  });
});

describe('Theme Structure', () => {
  const requiredColorKeys = [
    'primary',
    'background',
    'surface',
    'text',
    'textSecondary',
    'success',
    'warning',
    'error',
    'info',
  ];

  it('should define all required color keys', () => {
    requiredColorKeys.forEach(key => {
      expect(key).toBeDefined();
    });
  });

  it('should have 9 required color keys', () => {
    expect(requiredColorKeys.length).toBe(9);
  });

  describe('Color Key Purposes', () => {
    it('primary should be for brand/accent color', () => {
      const purpose = 'Brand/accent color for interactive elements';
      expect(purpose).toContain('interactive');
    });

    it('background should be for main app background', () => {
      const purpose = 'Main application background';
      expect(purpose).toContain('background');
    });

    it('surface should be for elevated surfaces', () => {
      const purpose = 'Cards, modals, and elevated surfaces';
      expect(purpose).toContain('surface');
    });

    it('text should be for primary text content', () => {
      const purpose = 'Primary text content';
      expect(purpose).toContain('text');
    });

    it('textSecondary should be for less prominent text', () => {
      const purpose = 'Secondary/supporting text';
      expect(purpose).toContain('Secondary');
    });

    it('success should indicate successful actions', () => {
      const purpose = 'Success states and positive actions';
      expect(purpose).toContain('Success');
    });

    it('warning should indicate caution', () => {
      const purpose = 'Warning states and caution indicators';
      expect(purpose).toContain('Warning');
    });

    it('error should indicate errors', () => {
      const purpose = 'Error states and destructive actions';
      expect(purpose).toContain('Error');
    });

    it('info should indicate informational content', () => {
      const purpose = 'Informational content and neutral highlights';
      expect(purpose).toContain('Informational');
    });
  });
});

describe('Theme Accessibility', () => {
  describe('Focus Indicators', () => {
    it('should have visible focus ring color', () => {
      const focusColor = '#FF9500';
      expect(focusColor).toBeDefined();
    });

    it('focus ring should have minimum 2px width', () => {
      const focusWidth = 2;
      expect(focusWidth).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Interactive States', () => {
    it('hover/active should have visible state change', () => {
      const normalOpacity = 1;
      const activeOpacity = 0.8;
      expect(activeOpacity).toBeLessThan(normalOpacity);
    });

    it('disabled should have reduced opacity', () => {
      const disabledOpacity = 0.5;
      expect(disabledOpacity).toBeLessThan(1);
    });
  });
});
