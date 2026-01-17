import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { store, persistor } from './src/store';
import ModernNavigation from './src/navigation/ModernNavigation';
import { ModernThemeProvider } from './src/theme';
import { ToastProvider } from './src/components/ui';

export default function App() {
  const LoadingComponent = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D0D' }}>
      <ActivityIndicator size="large" color="#FF6B4A" />
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PersistGate loading={<LoadingComponent />} persistor={persistor}>
          <ModernThemeProvider>
            <ToastProvider>
              <StatusBar style="light" />
              <ModernNavigation />
            </ToastProvider>
          </ModernThemeProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}