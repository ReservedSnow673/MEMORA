import {
  formatAccessibleTime,
  formatAccessibleProgress,
  formatAccessibleCount,
  formatAccessibleDuration,
  getAccessibilityHint,
  combineAccessibilityLabels,
  createImageAccessibilityLabel,
  accessibilityRole,
} from '../accessibility';

describe('accessibility utilities', () => {
  describe('formatAccessibleTime', () => {
    it('should return "just now" for recent times', () => {
      const now = new Date();
      expect(formatAccessibleTime(now)).toBe('just now');
    });

    it('should return "1 minute ago" for 1 minute', () => {
      const oneMinuteAgo = new Date(Date.now() - 60000);
      expect(formatAccessibleTime(oneMinuteAgo)).toBe('1 minute ago');
    });

    it('should return "X minutes ago" for less than an hour', () => {
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60000);
      expect(formatAccessibleTime(thirtyMinsAgo)).toBe('30 minutes ago');
    });

    it('should return "1 hour ago" for 1 hour', () => {
      const oneHourAgo = new Date(Date.now() - 3600000);
      expect(formatAccessibleTime(oneHourAgo)).toBe('1 hour ago');
    });

    it('should return "X hours ago" for less than a day', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 3600000);
      expect(formatAccessibleTime(fiveHoursAgo)).toBe('5 hours ago');
    });

    it('should return "yesterday" for 1 day ago', () => {
      const yesterday = new Date(Date.now() - 86400000);
      expect(formatAccessibleTime(yesterday)).toBe('yesterday');
    });

    it('should return "X days ago" for less than a week', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
      expect(formatAccessibleTime(threeDaysAgo)).toBe('3 days ago');
    });
  });

  describe('formatAccessibleProgress', () => {
    it('should format progress correctly', () => {
      expect(formatAccessibleProgress(50, 100)).toBe(
        '50 of 100, 50 percent complete'
      );
    });

    it('should handle zero', () => {
      expect(formatAccessibleProgress(0, 100)).toBe(
        '0 of 100, 0 percent complete'
      );
    });

    it('should handle complete', () => {
      expect(formatAccessibleProgress(100, 100)).toBe(
        '100 of 100, 100 percent complete'
      );
    });

    it('should round percentages', () => {
      expect(formatAccessibleProgress(1, 3)).toBe(
        '1 of 3, 33 percent complete'
      );
    });
  });

  describe('formatAccessibleCount', () => {
    it('should return "no items" for zero', () => {
      expect(formatAccessibleCount(0, 'image')).toBe('no images');
    });

    it('should return singular for 1', () => {
      expect(formatAccessibleCount(1, 'image')).toBe('1 image');
    });

    it('should return plural for more than 1', () => {
      expect(formatAccessibleCount(5, 'image')).toBe('5 images');
    });

    it('should use custom plural form', () => {
      expect(formatAccessibleCount(2, 'person', 'people')).toBe('2 people');
    });
  });

  describe('formatAccessibleDuration', () => {
    it('should format seconds', () => {
      expect(formatAccessibleDuration(5000)).toBe('5 seconds');
    });

    it('should format minutes', () => {
      expect(formatAccessibleDuration(120000)).toBe('2 minutes');
    });

    it('should format minutes and seconds', () => {
      expect(formatAccessibleDuration(90000)).toBe('1 minutes and 30 seconds');
    });

    it('should format hours', () => {
      expect(formatAccessibleDuration(3600000)).toBe('1 hours');
    });

    it('should format hours and minutes', () => {
      expect(formatAccessibleDuration(5400000)).toBe('1 hours and 30 minutes');
    });
  });

  describe('getAccessibilityHint', () => {
    it('should create hint without context', () => {
      expect(getAccessibilityHint('open settings')).toBe(
        'Double tap to open settings'
      );
    });

    it('should create hint with context', () => {
      expect(getAccessibilityHint('edit', 'this image')).toBe(
        'Double tap to edit for this image'
      );
    });
  });

  describe('combineAccessibilityLabels', () => {
    it('should combine labels', () => {
      expect(combineAccessibilityLabels('Label 1', 'Label 2')).toBe(
        'Label 1. Label 2'
      );
    });

    it('should filter out undefined', () => {
      expect(combineAccessibilityLabels('Label 1', undefined, 'Label 2')).toBe(
        'Label 1. Label 2'
      );
    });

    it('should filter out null', () => {
      expect(combineAccessibilityLabels('Label 1', null, 'Label 2')).toBe(
        'Label 1. Label 2'
      );
    });

    it('should filter out empty strings', () => {
      expect(combineAccessibilityLabels('Label 1', '', 'Label 2')).toBe(
        'Label 1. Label 2'
      );
    });
  });

  describe('createImageAccessibilityLabel', () => {
    it('should indicate processing state', () => {
      expect(createImageAccessibilityLabel('caption', true, true)).toBe(
        'Image. Caption is being generated.'
      );
    });

    it('should indicate no caption', () => {
      expect(createImageAccessibilityLabel(undefined, false, false)).toBe(
        'Image without caption. Double tap to generate caption.'
      );
    });

    it('should include caption', () => {
      expect(createImageAccessibilityLabel('A sunset over ocean', true, false)).toBe(
        'Image. A sunset over ocean'
      );
    });
  });

  describe('accessibilityRole', () => {
    it('should export correct roles', () => {
      expect(accessibilityRole.button).toBe('button');
      expect(accessibilityRole.header).toBe('header');
      expect(accessibilityRole.switch).toBe('switch');
      expect(accessibilityRole.progressbar).toBe('progressbar');
    });
  });
});
