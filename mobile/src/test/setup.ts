// Mock native modules before any imports
jest.mock('react-native/Libraries/Settings/NativeSettingsManager', () => ({
  default: {
    getConstants: () => ({}),
  },
  __esModule: true,
}));

jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => {
  const turboModuleProxy = new Proxy({}, {
    get: () => undefined,
  });
  return {
    getEnforcing: (name: string) => {
      // Return mock objects for commonly used modules
      if (name === 'SettingsManager') {
        return { getConstants: () => ({}) };
      }
      if (name === 'PlatformConstants') {
        return {
          getConstants: () => ({
            isTesting: true,
            reactNativeVersion: { major: 0, minor: 73, patch: 0 },
          }),
        };
      }
      return {};
    },
    get: () => turboModuleProxy,
  };
});

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('expo-media-library', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAssetsAsync: jest.fn(),
  getAssetInfoAsync: jest.fn(),
  MediaType: { photo: 'photo', video: 'video', audio: 'audio' },
  SortBy: { creationTime: 'creationTime', modificationTime: 'modificationTime' },
}));

jest.mock('expo-battery', () => ({
  getBatteryLevelAsync: jest.fn(() => Promise.resolve(0.8)),
  getBatteryStateAsync: jest.fn(() => Promise.resolve(1)),
  addBatteryLevelListener: jest.fn(() => ({ remove: jest.fn() })),
  addBatteryStateListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ type: 'wifi', isConnected: true })),
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
  cacheDirectory: '/cache/',
  documentDirectory: '/documents/',
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
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

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
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

jest.mock('@react-navigation/native', () => {
  return {
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      replace: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Global mocks
global.fetch = jest.fn();
global.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
global.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
