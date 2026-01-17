import {
  isGenericCaption,
  detectCaptionQuality,
  getCaptionInfo,
  parseMetadataFromBytes,
} from '../metadataReader';
import { FullMetadata } from '../metadataReader';

describe('MetadataReader', () => {
  describe('isGenericCaption', () => {
    it('should return true for empty string', () => {
      expect(isGenericCaption('')).toBe(true);
    });

    it('should return true for whitespace only', () => {
      expect(isGenericCaption('   ')).toBe(true);
    });

    it('should return true for IMG_xxxx patterns', () => {
      expect(isGenericCaption('IMG_1234')).toBe(true);
      expect(isGenericCaption('IMG_20210101')).toBe(true);
    });

    it('should return true for DSC_xxxx patterns', () => {
      expect(isGenericCaption('DSC_0001')).toBe(true);
    });

    it('should return true for screenshot patterns', () => {
      expect(isGenericCaption('Screenshot_123')).toBe(true);
    });

    it('should return true for date-based patterns', () => {
      expect(isGenericCaption('20210101_120000')).toBe(true);
    });

    it('should return false for meaningful captions', () => {
      expect(isGenericCaption('A beautiful sunset over the ocean')).toBe(false);
      expect(isGenericCaption('Family gathering at Christmas')).toBe(false);
      expect(isGenericCaption('My cat sleeping on the couch')).toBe(false);
    });
  });

  describe('detectCaptionQuality', () => {
    it('should return none for null', () => {
      expect(detectCaptionQuality(null)).toBe('none');
    });

    it('should return none for undefined', () => {
      expect(detectCaptionQuality(undefined)).toBe('none');
    });

    it('should return none for empty string', () => {
      expect(detectCaptionQuality('')).toBe('none');
    });

    it('should return generic for camera-generated names', () => {
      expect(detectCaptionQuality('IMG_1234')).toBe('generic');
      expect(detectCaptionQuality('DSC_0001')).toBe('generic');
    });

    it('should return meaningful for descriptive captions', () => {
      expect(detectCaptionQuality('A dog playing in the park')).toBe('meaningful');
    });
  });

  describe('getCaptionInfo', () => {
    it('should return no caption for empty metadata', () => {
      const metadata: FullMetadata = {};
      const result = getCaptionInfo(metadata);
      expect(result.hasCaption).toBe(false);
    });

    it('should prioritize XMP description', () => {
      const metadata: FullMetadata = {
        xmp: { description: 'XMP caption text' },
        exif: { imageDescription: 'EXIF caption text' },
        iptc: { captionAbstract: 'IPTC caption text' },
      };
      const result = getCaptionInfo(metadata);
      expect(result.hasCaption).toBe(true);
      expect(result.caption).toBe('XMP caption text');
      expect(result.source).toBe('xmp');
    });

    it('should fall back to EXIF when XMP is empty', () => {
      const metadata: FullMetadata = {
        xmp: { description: '' },
        exif: { imageDescription: 'EXIF caption text' },
      };
      const result = getCaptionInfo(metadata);
      expect(result.hasCaption).toBe(true);
      expect(result.caption).toBe('EXIF caption text');
      expect(result.source).toBe('exif');
    });

    it('should fall back to IPTC when XMP and EXIF are empty', () => {
      const metadata: FullMetadata = {
        iptc: { captionAbstract: 'IPTC caption text' },
      };
      const result = getCaptionInfo(metadata);
      expect(result.hasCaption).toBe(true);
      expect(result.caption).toBe('IPTC caption text');
      expect(result.source).toBe('iptc');
    });

    it('should skip generic captions in XMP and check EXIF', () => {
      const metadata: FullMetadata = {
        xmp: { description: 'IMG_1234' },
        exif: { imageDescription: 'A meaningful description' },
      };
      const result = getCaptionInfo(metadata);
      expect(result.hasCaption).toBe(true);
      expect(result.caption).toBe('A meaningful description');
      expect(result.source).toBe('exif');
    });

    it('should return no caption when all sources are generic', () => {
      const metadata: FullMetadata = {
        xmp: { description: 'IMG_1234' },
        exif: { imageDescription: 'DSC_0001' },
        iptc: { captionAbstract: 'Screenshot_123' },
      };
      const result = getCaptionInfo(metadata);
      expect(result.hasCaption).toBe(false);
    });
  });

  describe('parseMetadataFromBytes', () => {
    it('should return empty object for invalid data', () => {
      const result = parseMetadataFromBytes('');
      expect(result).toEqual({});
    });

    it('should handle non-image data gracefully', () => {
      const result = parseMetadataFromBytes(btoa('not an image'));
      expect(result).toBeDefined();
    });
  });
});
