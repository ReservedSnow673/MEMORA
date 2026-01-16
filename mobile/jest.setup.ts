import '@testing-library/jest-native/extend-expect';

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-media-library', () => ({
  getAssetsAsync: jest.fn(),
  getAssetInfoAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  createAssetAsync: jest.fn(),
  MediaType: {
    photo: 'photo',
    video: 'video',
    audio: 'audio',
  },
  SortBy: {
    creationTime: 'creationTime',
    modificationTime: 'modificationTime',
  },
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
  cacheDirectory: '/cache/',
  documentDirectory: '/documents/',
  EncodingType: {
    Base64: 'base64',
    UTF8: 'utf8',
  },
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(),
    closeAsync: jest.fn(),
  }),
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
  unregisterAllTasksAsync: jest.fn(),
}));

jest.mock('expo-background-fetch', () => ({
  getStatusAsync: jest.fn().mockResolvedValue(2),
  registerTaskAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
  BackgroundFetchStatus: { Available: 2, Restricted: 1, Denied: 0 },
  BackgroundFetchResult: { NewData: 2, NoData: 1, Failed: 3 },
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn().mockReturnValue(() => {}),
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    type: 'wifi',
  }),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  RN.AccessibilityInfo.announceForAccessibility = jest.fn();
  RN.AccessibilityInfo.isScreenReaderEnabled = jest.fn().mockResolvedValue(false);
  RN.AccessibilityInfo.isReduceMotionEnabled = jest.fn().mockResolvedValue(false);
  RN.AccessibilityInfo.isBoldTextEnabled = jest.fn().mockResolvedValue(false);
  RN.AccessibilityInfo.isGrayscaleEnabled = jest.fn().mockResolvedValue(false);
  RN.AccessibilityInfo.isInvertColorsEnabled = jest.fn().mockResolvedValue(false);
  RN.AccessibilityInfo.isReduceTransparencyEnabled = jest.fn().mockResolvedValue(false);
  RN.AccessibilityInfo.addEventListener = jest.fn().mockReturnValue({ remove: jest.fn() });
  
  return RN;
});

global.fetch = jest.fn();
global.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
global.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
