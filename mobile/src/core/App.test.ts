import App, { getApp, resetApp } from './App';

jest.mock('../database', () => ({
  initializeDatabase: jest.fn().mockResolvedValue({}),
  getDatabase: jest.fn().mockReturnValue({
    close: jest.fn().mockResolvedValue(undefined),
  }),
  getPreferencesStorage: jest.fn().mockReturnValue({
    load: jest.fn().mockResolvedValue({}),
    get: jest.fn().mockResolvedValue({
      aiMode: 'on-device',
      backgroundProcessing: true,
    }),
  }),
}));

jest.mock('../services/aiEngine', () => ({
  AiCaptionEngine: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    dispose: jest.fn(),
  })),
}));

jest.mock('../services/backgroundScheduler', () => ({
  getScheduler: jest.fn().mockReturnValue({
    initialize: jest.fn().mockResolvedValue(undefined),
    dispose: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../services/syncService', () => ({
  getSyncService: jest.fn().mockReturnValue({
    initialize: jest.fn().mockResolvedValue(undefined),
    dispose: jest.fn(),
  }),
}));

jest.mock('../services/permissions', () => ({
  checkPhotoPermission: jest.fn().mockResolvedValue('granted'),
}));

jest.mock('../errors', () => ({
  getErrorReportingService: jest.fn().mockReturnValue({
    report: jest.fn(),
  }),
}));

describe('App', () => {
  beforeEach(() => {
    resetApp();
  });

  afterEach(() => {
    resetApp();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      const app = new App();

      const result = await app.initialize();

      expect(result.success).toBe(true);
      expect(result.permissionGranted).toBe(true);
    });

    it('should not double initialize', async () => {
      const app = new App();

      await app.initialize();
      const result = await app.initialize();

      expect(result.success).toBe(true);
    });

    it('should update state during initialization', async () => {
      const app = new App();
      const states: boolean[] = [];
      app.subscribe((state) => states.push(state.isLoading));

      await app.initialize();

      expect(states).toContain(true);
    });
  });

  describe('getState', () => {
    it('should return initial state', () => {
      const app = new App();
      const state = app.getState();

      expect(state.isInitialized).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.hasPermission).toBe(false);
    });

    it('should return updated state after initialization', async () => {
      const app = new App();
      await app.initialize();

      const state = app.getState();

      expect(state.isInitialized).toBe(true);
      expect(state.hasPermission).toBe(true);
    });
  });

  describe('getAiEngine', () => {
    it('should return null before initialization', () => {
      const app = new App();
      expect(app.getAiEngine()).toBeNull();
    });

    it('should return engine after initialization', async () => {
      const app = new App();
      await app.initialize();

      expect(app.getAiEngine()).toBeDefined();
    });
  });

  describe('subscribe', () => {
    it('should notify listeners on state change', async () => {
      const app = new App();
      const listener = jest.fn();
      app.subscribe(listener);

      await app.initialize();

      expect(listener).toHaveBeenCalled();
    });

    it('should unsubscribe', async () => {
      const app = new App();
      const listener = jest.fn();
      const unsubscribe = app.subscribe(listener);

      unsubscribe();
      await app.initialize();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should reset state', async () => {
      const app = new App();
      await app.initialize();

      await app.dispose();
      const state = app.getState();

      expect(state.isInitialized).toBe(false);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const app1 = getApp();
      const app2 = getApp();

      expect(app1).toBe(app2);
    });

    it('should create new instance after reset', () => {
      const app1 = getApp();
      resetApp();
      const app2 = getApp();

      expect(app1).not.toBe(app2);
    });
  });
});
