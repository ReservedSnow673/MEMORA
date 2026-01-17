import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AccessibilityInfo } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { StatusScreen } from '../screens/StatusScreen';
import { CaptionEditorScreen } from '../screens/CaptionEditorScreen';
import { PermissionScreen } from '../screens/PermissionScreen';

export type RootStackParamList = {
  Permission: undefined;
  Home: undefined;
  Settings: undefined;
  Status: undefined;
  CaptionEditor: { assetId: string; assetUri: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator(): React.ReactElement {
  const announceScreenChange = (routeName: string) => {
    const screenNames: Record<string, string> = {
      Permission: 'Permission request screen',
      Home: 'Memora home screen',
      Settings: 'Settings screen',
      Status: 'Processing status screen',
      CaptionEditor: 'Caption editor screen',
    };
    const announcement = screenNames[routeName] ?? `${routeName} screen`;
    AccessibilityInfo.announceForAccessibility(`Navigated to ${announcement}`);
  };

  return (
    <NavigationContainer
      onStateChange={(state) => {
        if (state) {
          const currentRoute = state.routes[state.index];
          if (currentRoute) {
            announceScreenChange(currentRoute.name);
          }
        }
      }}
    >
      <Stack.Navigator
        initialRouteName="Permission"
        screenOptions={{
          headerShown: true,
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen
          name="Permission"
          component={PermissionScreen}
          options={{
            title: 'Welcome to Memora',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Memora',
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
          }}
        />
        <Stack.Screen
          name="Status"
          component={StatusScreen}
          options={{
            title: 'Processing Status',
          }}
        />
        <Stack.Screen
          name="CaptionEditor"
          component={CaptionEditorScreen}
          options={{
            title: 'Edit Caption',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
