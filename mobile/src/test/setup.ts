import '@testing-library/jest-native/extend-expect';

jest.mock('expo-media-library', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAssetsAsync: jest.fn(),
  getAssetInfoAsync: jest.fn(),
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

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    AccessibilityInfo: {
      announceForAccessibility: jest.fn(),
      isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
  };
});

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      replace: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
  };
});
