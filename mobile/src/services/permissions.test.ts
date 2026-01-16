import * as MediaLibrary from 'expo-media-library';
import {
  checkPhotoPermission,
  requestPhotoPermission,
  canAccessPhotos,
} from './permissions';

jest.mock('expo-media-library');

const mockMediaLibrary = MediaLibrary as jest.Mocked<typeof MediaLibrary>;

describe('Permission Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkPhotoPermission', () => {
    it('should return undetermined when permission not requested', async () => {
      mockMediaLibrary.getPermissionsAsync.mockResolvedValue({
        status: 'undetermined',
        accessPrivileges: 'none',
        granted: false,
        expires: 'never',
        canAskAgain: true,
      });

      const result = await checkPhotoPermission();
      expect(result).toBe('undetermined');
    });

    it('should return granted when full access granted', async () => {
      mockMediaLibrary.getPermissionsAsync.mockResolvedValue({
        status: 'granted',
        accessPrivileges: 'all',
        granted: true,
        expires: 'never',
        canAskAgain: true,
      });

      const result = await checkPhotoPermission();
      expect(result).toBe('granted');
    });

    it('should return limited when limited access granted', async () => {
      mockMediaLibrary.getPermissionsAsync.mockResolvedValue({
        status: 'granted',
        accessPrivileges: 'limited',
        granted: true,
        expires: 'never',
        canAskAgain: true,
      });

      const result = await checkPhotoPermission();
      expect(result).toBe('limited');
    });

    it('should return denied when permission denied', async () => {
      mockMediaLibrary.getPermissionsAsync.mockResolvedValue({
        status: 'denied',
        accessPrivileges: 'none',
        granted: false,
        expires: 'never',
        canAskAgain: false,
      });

      const result = await checkPhotoPermission();
      expect(result).toBe('denied');
    });
  });

  describe('requestPhotoPermission', () => {
    it('should return granted when user grants permission', async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted',
        accessPrivileges: 'all',
        granted: true,
        expires: 'never',
        canAskAgain: true,
      });

      const result = await requestPhotoPermission();
      expect(result).toBe('granted');
    });

    it('should return denied when user denies permission', async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'denied',
        accessPrivileges: 'none',
        granted: false,
        expires: 'never',
        canAskAgain: false,
      });

      const result = await requestPhotoPermission();
      expect(result).toBe('denied');
    });

    it('should return limited when user selects limited photos', async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValue({
        status: 'granted',
        accessPrivileges: 'limited',
        granted: true,
        expires: 'never',
        canAskAgain: true,
      });

      const result = await requestPhotoPermission();
      expect(result).toBe('limited');
    });
  });

  describe('canAccessPhotos', () => {
    it('should return true for granted status', () => {
      expect(canAccessPhotos('granted')).toBe(true);
    });

    it('should return true for limited status', () => {
      expect(canAccessPhotos('limited')).toBe(true);
    });

    it('should return false for denied status', () => {
      expect(canAccessPhotos('denied')).toBe(false);
    });

    it('should return false for undetermined status', () => {
      expect(canAccessPhotos('undetermined')).toBe(false);
    });
  });
});
