import { MemoraError, ErrorSeverity, createError, handleError } from './errorTypes';
import { getDatabase } from '../database';

export interface ErrorReport {
  id: string;
  error: MemoraError;
  deviceInfo: DeviceInfo;
  appVersion: string;
  createdAt: Date;
  reported: boolean;
  reportedAt?: Date;
}

export interface DeviceInfo {
  platform: 'ios' | 'android';
  osVersion: string;
  deviceModel: string;
  appVersion: string;
  locale: string;
  timezone: string;
}

export interface ErrorReportingConfig {
  enabled: boolean;
  minSeverity: ErrorSeverity;
  maxReportsPerHour: number;
  reportEndpoint?: string;
}

const DEFAULT_CONFIG: ErrorReportingConfig = {
  enabled: true,
  minSeverity: 'error',
  maxReportsPerHour: 10,
};

const SEVERITY_ORDER: Record<ErrorSeverity, number> = {
  info: 0,
  warning: 1,
  error: 2,
  critical: 3,
};

class ErrorReportingService {
  private config: ErrorReportingConfig;
  private reports: Map<string, ErrorReport> = new Map();
  private reportsThisHour: number = 0;
  private lastHourReset: Date = new Date();
  private listeners: Set<(error: MemoraError) => void> = new Set();

  constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async report(error: Error | MemoraError, context?: Record<string, unknown>): Promise<string | null> {
    const memoraError = this.ensureMemoraError(error);

    if (!this.shouldReport(memoraError)) {
      return null;
    }

    this.resetHourlyCounterIfNeeded();

    if (this.reportsThisHour >= this.config.maxReportsPerHour) {
      console.warn('Error report rate limit exceeded');
      return null;
    }

    const report = this.createReport(memoraError);
    this.reports.set(report.id, report);
    this.reportsThisHour++;

    this.notifyListeners(memoraError);

    if (this.config.reportEndpoint) {
      await this.sendToServer(report);
    }

    return report.id;
  }

  private ensureMemoraError(error: Error | MemoraError): MemoraError {
    if ('code' in error && 'severity' in error) {
      return error as MemoraError;
    }
    return handleError(error as Error);
  }

  private shouldReport(error: MemoraError): boolean {
    if (!this.config.enabled) return false;

    const errorLevel = SEVERITY_ORDER[error.severity];
    const minLevel = SEVERITY_ORDER[this.config.minSeverity];

    return errorLevel >= minLevel;
  }

  private resetHourlyCounterIfNeeded(): void {
    const now = new Date();
    const hoursSinceReset = (now.getTime() - this.lastHourReset.getTime()) / 3600000;

    if (hoursSinceReset >= 1) {
      this.reportsThisHour = 0;
      this.lastHourReset = now;
    }
  }

  private createReport(error: MemoraError): ErrorReport {
    return {
      id: this.generateId(),
      error,
      deviceInfo: this.getDeviceInfo(),
      appVersion: '1.0.0',
      createdAt: new Date(),
      reported: false,
    };
  }

  private getDeviceInfo(): DeviceInfo {
    return {
      platform: 'ios',
      osVersion: '17.0',
      deviceModel: 'iPhone',
      appVersion: '1.0.0',
      locale: 'en-US',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  private async sendToServer(report: ErrorReport): Promise<void> {
    if (!this.config.reportEndpoint) return;

    try {
      const response = await fetch(this.config.reportEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errorCode: report.error.code,
          message: report.error.message,
          severity: report.error.severity,
          metadata: report.error.metadata,
          stack: report.error.stack,
          deviceInfo: report.deviceInfo,
          appVersion: report.appVersion,
          timestamp: report.error.timestamp.toISOString(),
        }),
      });

      if (response.ok) {
        report.reported = true;
        report.reportedAt = new Date();
      }
    } catch (error) {
      console.error('Failed to send error report:', error);
    }
  }

  subscribe(listener: (error: MemoraError) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(error: MemoraError): void {
    for (const listener of this.listeners) {
      try {
        listener(error);
      } catch (e) {
        console.error('Error listener threw:', e);
      }
    }
  }

  getReports(): ErrorReport[] {
    return Array.from(this.reports.values());
  }

  getReportsByCode(code: string): ErrorReport[] {
    return this.getReports().filter((r) => r.error.code === code);
  }

  getReportsBySeverity(severity: ErrorSeverity): ErrorReport[] {
    return this.getReports().filter((r) => r.error.severity === severity);
  }

  getUnreported(): ErrorReport[] {
    return this.getReports().filter((r) => !r.reported);
  }

  clearReports(): void {
    this.reports.clear();
  }

  updateConfig(updates: Partial<ErrorReportingConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getConfig(): ErrorReportingConfig {
    return { ...this.config };
  }

  private generateId(): string {
    return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

let serviceInstance: ErrorReportingService | null = null;

export function getErrorReportingService(): ErrorReportingService {
  if (!serviceInstance) {
    serviceInstance = new ErrorReportingService();
  }
  return serviceInstance;
}

export function resetErrorReportingService(): void {
  serviceInstance = null;
}

export { ErrorReportingService };
export default ErrorReportingService;
