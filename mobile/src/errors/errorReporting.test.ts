import ErrorReportingService, {
  getErrorReportingService,
  resetErrorReportingService,
} from './errorReporting';
import { createError } from './errorTypes';

describe('ErrorReportingService', () => {
  beforeEach(() => {
    resetErrorReportingService();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    resetErrorReportingService();
    jest.resetAllMocks();
  });

  describe('report', () => {
    it('should create report for error', async () => {
      const service = new ErrorReportingService();
      const error = createError('API_ERROR');

      const reportId = await service.report(error);

      expect(reportId).toBeDefined();
      expect(service.getReports()).toHaveLength(1);
    });

    it('should not report when disabled', async () => {
      const service = new ErrorReportingService({ enabled: false });
      const error = createError('API_ERROR');

      const reportId = await service.report(error);

      expect(reportId).toBeNull();
    });

    it('should not report below minimum severity', async () => {
      const service = new ErrorReportingService({ minSeverity: 'critical' });
      const error = createError('VALIDATION_ERROR');

      const reportId = await service.report(error);

      expect(reportId).toBeNull();
    });

    it('should handle regular Error', async () => {
      const service = new ErrorReportingService();
      const error = new Error('Something failed');

      const reportId = await service.report(error);

      expect(reportId).toBeDefined();
    });

    it('should rate limit reports', async () => {
      const service = new ErrorReportingService({ maxReportsPerHour: 2 });
      const error = createError('API_ERROR');

      await service.report(error);
      await service.report(error);
      const thirdReport = await service.report(error);

      expect(thirdReport).toBeNull();
      expect(service.getReports()).toHaveLength(2);
    });
  });

  describe('subscribe', () => {
    it('should notify listeners on error', async () => {
      const service = new ErrorReportingService();
      const listener = jest.fn();
      service.subscribe(listener);

      const error = createError('API_ERROR');
      await service.report(error);

      expect(listener).toHaveBeenCalledWith(error);
    });

    it('should unsubscribe', async () => {
      const service = new ErrorReportingService();
      const listener = jest.fn();
      const unsubscribe = service.subscribe(listener);

      unsubscribe();
      await service.report(createError('API_ERROR'));

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('getReports', () => {
    it('should return all reports', async () => {
      const service = new ErrorReportingService();

      await service.report(createError('API_ERROR'));
      await service.report(createError('NETWORK_ERROR'));

      expect(service.getReports()).toHaveLength(2);
    });
  });

  describe('getReportsByCode', () => {
    it('should filter by error code', async () => {
      const service = new ErrorReportingService();

      await service.report(createError('API_ERROR'));
      await service.report(createError('NETWORK_ERROR'));
      await service.report(createError('API_ERROR'));

      const apiErrors = service.getReportsByCode('API_ERROR');

      expect(apiErrors).toHaveLength(2);
    });
  });

  describe('getReportsBySeverity', () => {
    it('should filter by severity', async () => {
      const service = new ErrorReportingService({ minSeverity: 'info' });

      await service.report(createError('GALLERY_EMPTY'));
      await service.report(createError('API_ERROR'));
      await service.report(createError('STORAGE_FULL'));

      const criticalErrors = service.getReportsBySeverity('critical');

      expect(criticalErrors).toHaveLength(1);
    });
  });

  describe('getUnreported', () => {
    it('should return unreported errors', async () => {
      const service = new ErrorReportingService();

      await service.report(createError('API_ERROR'));

      const unreported = service.getUnreported();

      expect(unreported).toHaveLength(1);
      expect(unreported[0].reported).toBe(false);
    });
  });

  describe('clearReports', () => {
    it('should clear all reports', async () => {
      const service = new ErrorReportingService();

      await service.report(createError('API_ERROR'));
      service.clearReports();

      expect(service.getReports()).toHaveLength(0);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const service = new ErrorReportingService();

      service.updateConfig({ enabled: false });

      expect(service.getConfig().enabled).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const service = new ErrorReportingService({
        minSeverity: 'warning',
        maxReportsPerHour: 5,
      });

      const config = service.getConfig();

      expect(config.minSeverity).toBe('warning');
      expect(config.maxReportsPerHour).toBe(5);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const service1 = getErrorReportingService();
      const service2 = getErrorReportingService();

      expect(service1).toBe(service2);
    });

    it('should create new instance after reset', () => {
      const service1 = getErrorReportingService();
      resetErrorReportingService();
      const service2 = getErrorReportingService();

      expect(service1).not.toBe(service2);
    });
  });
});
