import * as MediaLibrary from 'expo-media-library';

export type PhotoPermissionStatus = 'undetermined' | 'granted' | 'limited' | 'denied';
export type BackgroundPermissionStatus = 'undetermined' | 'granted' | 'denied';

export async function checkPhotoPermission(): Promise<PhotoPermissionStatus> {
  const { status, accessPrivileges } = await MediaLibrary.getPermissionsAsync();

  if (status === 'undetermined') {
    return 'undetermined';
  }

  if (status === 'denied') {
    return 'denied';
  }

  if (status === 'granted') {
    if (accessPrivileges === 'limited') {
      return 'limited';
    }
    return 'granted';
  }

  return 'denied';
}

export async function requestPhotoPermission(): Promise<PhotoPermissionStatus> {
  const { status, accessPrivileges } = await MediaLibrary.requestPermissionsAsync();

  if (status === 'undetermined') {
    return 'undetermined';
  }

  if (status === 'denied') {
    return 'denied';
  }

  if (status === 'granted') {
    if (accessPrivileges === 'limited') {
      return 'limited';
    }
    return 'granted';
  }

  return 'denied';
}

export function canAccessPhotos(status: PhotoPermissionStatus): boolean {
  return status === 'granted' || status === 'limited';
}
