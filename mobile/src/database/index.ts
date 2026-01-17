export {
  LocalDatabase,
  getDatabase,
  initializeDatabase,
  resetDatabase,
} from './localDatabase';

export type {
  ImageRecord,
  CaptionHistory,
  ProcessingLog,
} from './localDatabase';

export {
  PreferencesStorage,
  getPreferencesStorage,
  resetPreferencesStorage,
  DEFAULT_PREFERENCES,
} from './preferencesStorage';
