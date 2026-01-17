// Enable React 19 act environment
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Suppress React 19 console warnings in tests
const originalError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: An update to') ||
     args[0].includes('act(...)') ||
     args[0].includes('not wrapped in act'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};

// Mock native modules before any imports
jest.mock('react-native/Libraries/Utilities/NativeDeviceInfo', () => ({
  default: {
    getConstants: () => ({
      Dimensions: {
        window: { width: 375, height: 812, scale: 2, fontScale: 1 },
        screen: { width: 375, height: 812, scale: 2, fontScale: 1 },
      },
    }),
  },
  __esModule: true,
}));

jest.mock('react-native/Libraries/Settings/NativeSettingsManager', () => ({
  default: {
    getConstants: () => ({}),
  },
  __esModule: true,
}));

jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => {
  const mockModules: Record<string, unknown> = {
    SettingsManager: { getConstants: () => ({}) },
    DeviceInfo: {
      getConstants: () => ({
        Dimensions: {
          window: { width: 375, height: 812, scale: 2, fontScale: 1 },
          screen: { width: 375, height: 812, scale: 2, fontScale: 1 },
        },
      }),
    },
    PlatformConstants: {
      getConstants: () => ({
        isTesting: true,
        reactNativeVersion: { major: 0, minor: 73, patch: 0 },
      }),
    },
    SourceCode: {
      getConstants: () => ({ scriptURL: 'http://localhost:8081/index.bundle' }),
    },
    StatusBarManager: {
      getConstants: () => ({ HEIGHT: 44 }),
    },
    Appearance: {
      getConstants: () => ({ colorScheme: 'light' }),
    },
    I18nManager: {
      getConstants: () => ({ isRTL: false, doLeftAndRightSwapInRTL: false }),
    },
    NativeAnimatedModule: {
      startOperationBatch: jest.fn(),
      finishOperationBatch: jest.fn(),
      createAnimatedNode: jest.fn(),
      updateAnimatedNodeConfig: jest.fn(),
      getValue: jest.fn(),
      startListeningToAnimatedNodeValue: jest.fn(),
      stopListeningToAnimatedNodeValue: jest.fn(),
      connectAnimatedNodes: jest.fn(),
      disconnectAnimatedNodes: jest.fn(),
      startAnimatingNode: jest.fn(),
      stopAnimation: jest.fn(),
      setAnimatedNodeValue: jest.fn(),
      setAnimatedNodeOffset: jest.fn(),
      flattenAnimatedNodeOffset: jest.fn(),
      extractAnimatedNodeOffset: jest.fn(),
      connectAnimatedNodeToView: jest.fn(),
      disconnectAnimatedNodeFromView: jest.fn(),
      restoreDefaultValues: jest.fn(),
      dropAnimatedNode: jest.fn(),
      addAnimatedEventToView: jest.fn(),
      removeAnimatedEventFromView: jest.fn(),
      queueAndExecuteBatchedOperations: jest.fn(),
    },
  };

  return {
    getEnforcing: (name: string) => mockModules[name] || {},
    get: (name: string) => mockModules[name] || null,
  };
});

// Mock NativeAnimatedHelper for RN 0.81+
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({
  __esModule: true,
  default: {
    API: {
      startOperationBatch: jest.fn(),
      finishOperationBatch: jest.fn(),
      createAnimatedNode: jest.fn(),
      updateAnimatedNodeConfig: jest.fn(),
      getValue: jest.fn(),
      startListeningToAnimatedNodeValue: jest.fn(),
      stopListeningToAnimatedNodeValue: jest.fn(),
      connectAnimatedNodes: jest.fn(),
      disconnectAnimatedNodes: jest.fn(),
      startAnimatingNode: jest.fn(),
      stopAnimation: jest.fn(),
      setAnimatedNodeValue: jest.fn(),
      setAnimatedNodeOffset: jest.fn(),
      flattenAnimatedNodeOffset: jest.fn(),
      extractAnimatedNodeOffset: jest.fn(),
      connectAnimatedNodeToView: jest.fn(),
      disconnectAnimatedNodeFromView: jest.fn(),
      restoreDefaultValues: jest.fn(),
      dropAnimatedNode: jest.fn(),
      addAnimatedEventToView: jest.fn(),
      removeAnimatedEventFromView: jest.fn(),
      queueAndExecuteBatchedOperations: jest.fn(),
    },
    addWhitelistedNativeProps: jest.fn(),
    addWhitelistedInterpolationParam: jest.fn(),
    validateInterpolation: jest.fn(),
    generateNewNodeTag: jest.fn(() => 1),
    generateNewAnimationId: jest.fn(() => 1),
    assertNativeAnimatedModule: jest.fn(),
    shouldUseNativeDriver: jest.fn(() => false),
    transformDataType: jest.fn((value: unknown) => value),
  },
  shouldUseNativeDriver: jest.fn(() => false),
}), { virtual: true });

// Mock the new private animated path for RN 0.81+
jest.mock('react-native/src/private/animated/NativeAnimatedHelper', () => ({
  __esModule: true,
  default: {
    API: {
      flushQueue: jest.fn(),
      startOperationBatch: jest.fn(),
      finishOperationBatch: jest.fn(),
      createAnimatedNode: jest.fn(),
      getValue: jest.fn(),
      startListeningToAnimatedNodeValue: jest.fn(),
      stopListeningToAnimatedNodeValue: jest.fn(),
      connectAnimatedNodes: jest.fn(),
      disconnectAnimatedNodes: jest.fn(),
      startAnimatingNode: jest.fn(),
      stopAnimation: jest.fn(),
      setAnimatedNodeValue: jest.fn(),
      setAnimatedNodeOffset: jest.fn(),
      flattenAnimatedNodeOffset: jest.fn(),
      extractAnimatedNodeOffset: jest.fn(),
      connectAnimatedNodeToView: jest.fn(),
      disconnectAnimatedNodeFromView: jest.fn(),
      restoreDefaultValues: jest.fn(),
      dropAnimatedNode: jest.fn(),
      addAnimatedEventToView: jest.fn(),
      removeAnimatedEventFromView: jest.fn(),
      queueAndExecuteBatchedOperations: jest.fn(),
    },
    flushQueue: jest.fn(),
    addWhitelistedNativeProps: jest.fn(),
    addWhitelistedInterpolationParam: jest.fn(),
    validateInterpolation: jest.fn(),
    generateNewNodeTag: jest.fn(() => 1),
    generateNewAnimationId: jest.fn(() => 1),
    assertNativeAnimatedModule: jest.fn(),
    shouldUseNativeDriver: jest.fn(() => false),
    transformDataType: jest.fn((value: unknown) => value),
  },
  shouldUseNativeDriver: jest.fn(() => false),
}), { virtual: true });

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

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({
    uri: 'file:///mock/manipulated-image.jpg',
    width: 100,
    height: 100,
  }),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
    WEBP: 'webp',
  },
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  cacheDirectory: '/cache/',
  documentDirectory: '/documents/',
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
  Paths: {
    cache: { uri: '/cache/' },
    document: { uri: '/documents/' },
    bundle: { uri: '/bundle/' },
  },
  File: class MockFile {
    uri: string;
    constructor(...args: string[]) {
      this.uri = args.join('/');
    }
    exists() { return false; }
    text() { return Promise.resolve(''); }
    write() { return Promise.resolve(); }
    delete() { return Promise.resolve(); }
    copy() { return Promise.resolve(); }
    move() { return Promise.resolve(); }
  },
  Directory: class MockDirectory {
    uri: string;
    constructor(...args: string[]) {
      this.uri = args.join('/');
    }
    exists() { return false; }
    create() { return Promise.resolve(); }
    delete() { return Promise.resolve(); }
    list() { return []; }
  },
}));

// Mock expo-file-system/legacy for backward compatibility
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  copyAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  cacheDirectory: '/cache/',
  documentDirectory: '/documents/',
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
}));

jest.mock('expo-sqlite', () => {
  // Mock for new async API (SDK 54)
  const mockDb = {
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue({ changes: 0, lastInsertRowId: 0 }),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    getAllAsync: jest.fn().mockResolvedValue([]),
    closeAsync: jest.fn().mockResolvedValue(undefined),
  };

  return {
    openDatabaseAsync: jest.fn().mockResolvedValue(mockDb),
    openDatabaseSync: jest.fn().mockReturnValue(mockDb),
  };
});

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

// Mock NativeEventEmitter
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  return class MockNativeEventEmitter {
    addListener = jest.fn(() => ({ remove: jest.fn() }));
    removeAllListeners = jest.fn();
    emit = jest.fn();
    listenerCount = jest.fn(() => 0);
  };
});

// Mock AccessibilityInfo
jest.mock('react-native/Libraries/Components/AccessibilityInfo/AccessibilityInfo', () => ({
  isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
  isBoldTextEnabled: jest.fn(() => Promise.resolve(false)),
  isGrayscaleEnabled: jest.fn(() => Promise.resolve(false)),
  isInvertColorsEnabled: jest.fn(() => Promise.resolve(false)),
  isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
  isReduceTransparencyEnabled: jest.fn(() => Promise.resolve(false)),
  announceForAccessibility: jest.fn(() => Promise.resolve()),
  announceForAccessibilityWithOptions: jest.fn(() => Promise.resolve()),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  setAccessibilityFocus: jest.fn(),
}));

// Mock react-native AccessibilityInfo export
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    AccessibilityInfo: {
      isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
      isBoldTextEnabled: jest.fn(() => Promise.resolve(false)),
      isGrayscaleEnabled: jest.fn(() => Promise.resolve(false)),
      isInvertColorsEnabled: jest.fn(() => Promise.resolve(false)),
      isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
      isReduceTransparencyEnabled: jest.fn(() => Promise.resolve(false)),
      announceForAccessibility: jest.fn(() => Promise.resolve()),
      announceForAccessibilityWithOptions: jest.fn(() => Promise.resolve()),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      setAccessibilityFocus: jest.fn(),
    },
    NativeModules: {
      ...RN.NativeModules,
      SettingsManager: { getConstants: () => ({}) },
      StatusBarManager: { getConstants: () => ({ HEIGHT: 44 }) },
    },
  };
});
// Mock Firebase
jest.mock('@react-native-firebase/app', () => ({
  initializeApp: jest.fn(),
  firebase: {
    app: jest.fn(() => ({
      initializeApp: jest.fn(),
    })),
  },
}));

jest.mock('@react-native-firebase/auth', () => {
  const mockUser = {
    uid: 'test-uid',
    email: 'test@example.com',
    displayName: null,
    isAnonymous: false,
    getIdToken: jest.fn(() => Promise.resolve('test-token')),
    updateProfile: jest.fn(),
    linkWithCredential: jest.fn(),
  };

  return {
    __esModule: true,
    default: jest.fn(() => ({
      createUserWithEmailAndPassword: jest.fn().mockResolvedValue({ user: mockUser }),
      signInWithEmailAndPassword: jest.fn().mockResolvedValue({ user: mockUser }),
      signInAnonymously: jest.fn().mockResolvedValue({
        user: { ...mockUser, isAnonymous: true },
      }),
      signOut: jest.fn().mockResolvedValue(undefined),
      onAuthStateChanged: jest.fn((callback) => {
        callback(mockUser);
        return jest.fn();
      }),
      currentUser: mockUser,
    })),
    FirebaseAuthTypes: {},
  };
});


