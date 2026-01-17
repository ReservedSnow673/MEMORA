import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppSettings } from '../types';

const initialState: AppSettings = {
  backgroundFetchFrequency: 'daily',
  wifiOnly: false,
  chargingOnly: false,
  autoProcessImages: true,
  saveToGooglePhotos: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSettings: (state, action: PayloadAction<Partial<AppSettings>>) => {
      return { ...state, ...action.payload };
    },
    setBackgroundFetchFrequency: (state, action: PayloadAction<'hourly' | 'daily' | 'weekly'>) => {
      state.backgroundFetchFrequency = action.payload;
    },
    setWifiOnly: (state, action: PayloadAction<boolean>) => {
      state.wifiOnly = action.payload;
    },
    setChargingOnly: (state, action: PayloadAction<boolean>) => {
      state.chargingOnly = action.payload;
    },
    setOpenAIApiKey: (state, action: PayloadAction<string>) => {
      state.openAIApiKey = action.payload;
    },
    setAutoProcessImages: (state, action: PayloadAction<boolean>) => {
      state.autoProcessImages = action.payload;
    },
    setSaveToGooglePhotos: (state, action: PayloadAction<boolean>) => {
      state.saveToGooglePhotos = action.payload;
    },
  },
});

export const {
  updateSettings,
  setBackgroundFetchFrequency,
  setWifiOnly,
  setChargingOnly,
  setOpenAIApiKey,
  setAutoProcessImages,
  setSaveToGooglePhotos,
} = settingsSlice.actions;

export default settingsSlice.reducer;