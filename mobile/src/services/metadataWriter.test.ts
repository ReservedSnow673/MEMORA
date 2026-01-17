import { validateCaption, sanitizeCaption } from '../metadataWriter';

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
  cacheDirectory: '/cache/',
  EncodingType: {
    Base64: 'base64',
  },
}));

jest.mock('expo-media-library', () => ({
  createAssetAsync: jest.fn().mockResolvedValue({ uri: '/new-asset-uri' }),
}));

describe('MetadataWriter', () => {
  describe('validateCaption', () => {
    it('should reject empty caption', () => {
      expect(validateCaption('')).toEqual({
        valid: false,
        error: 'Caption cannot be empty',
      });
    });

    it('should reject whitespace-only caption', () => {
      expect(validateCaption('   ')).toEqual({
        valid: false,
        error: 'Caption cannot be empty',
      });
    });

    it('should reject caption exceeding 5000 characters', () => {
      const longCaption = 'a'.repeat(5001);
      expect(validateCaption(longCaption)).toEqual({
        valid: false,
        error: 'Caption exceeds maximum length of 5000 characters',
      });
    });

    it('should accept caption at exactly 5000 characters', () => {
      const maxCaption = 'a'.repeat(5000);
      expect(validateCaption(maxCaption)).toEqual({ valid: true });
    });

    it('should reject captions with control characters', () => {
      expect(validateCaption('Hello\x00World')).toEqual({
        valid: false,
        error: 'Caption contains invalid control characters',
      });
    });

    it('should accept valid caption', () => {
      expect(validateCaption('A beautiful sunset over the ocean')).toEqual({
        valid: true,
      });
    });

    it('should accept caption with unicode characters', () => {
      expect(validateCaption('日本語のキャプション 🌅')).toEqual({
        valid: true,
      });
    });

    it('should accept caption with newlines', () => {
      expect(validateCaption('Line 1\nLine 2')).toEqual({ valid: true });
    });
  });

  describe('sanitizeCaption', () => {
    it('should trim whitespace', () => {
      expect(sanitizeCaption('  Hello World  ')).toBe('Hello World');
    });

    it('should remove control characters', () => {
      expect(sanitizeCaption('Hello\x00World')).toBe('HelloWorld');
    });

    it('should truncate to 5000 characters', () => {
      const longCaption = 'a'.repeat(6000);
      expect(sanitizeCaption(longCaption).length).toBe(5000);
    });

    it('should preserve unicode characters', () => {
      expect(sanitizeCaption('日本語 🌅')).toBe('日本語 🌅');
    });

    it('should preserve newlines', () => {
      expect(sanitizeCaption('Line 1\nLine 2')).toBe('Line 1\nLine 2');
    });
  });
});
