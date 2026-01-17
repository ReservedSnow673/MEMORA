import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { AccessibleText, AccessibleButton, AccessibleStatus } from '../components';
import { usePermissionStore } from '../store';
import { requestPhotoPermission, checkPhotoPermission } from '../services/permissions';
import { firebaseAuthService } from '../services/firebaseAuth';

type PermissionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Permission'>;

interface PermissionScreenProps {
  navigation: PermissionScreenNavigationProp;
}

export function PermissionScreen({ navigation }: PermissionScreenProps): React.ReactElement {
  const { photoPermission, setPhotoPermission } = usePermissionStore();
  const [isRequesting, setIsRequesting] = useState(false);
  const [showAuthOption, setShowAuthOption] = useState(false);

  useEffect(() => {
    checkInitialPermission();
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check if user is already authenticated
      const currentUser = firebaseAuthService.getCurrentUser();
      if (currentUser) {
        // User already authenticated, continue to permission check
        return;
      }
      // For offline-first usage, sign in anonymously if not authenticated
      // This allows the app to work without requiring email/password
      if (!firebaseAuthService.isAuthenticated()) {
        await firebaseAuthService.signInAnonymously();
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      // App can still work without authentication for offline use
    }
  };

  const checkInitialPermission = async () => {
    const status = await checkPhotoPermission();
    setPhotoPermission(status);
    if (status === 'granted') {
      navigation.replace('Home');
    }
  };

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const status = await requestPhotoPermission();
      setPhotoPermission(status);
      if (status === 'granted' || status === 'limited') {
        navigation.replace('Home');
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const getStatusMessage = (): string => {
    switch (photoPermission) {
      case 'denied':
        return 'Photo access was denied. Please enable it in Settings to use Memora.';
      case 'limited':
        return 'Limited photo access granted. Some features may be restricted.';
      default:
        return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <AccessibleText role="header" level={1} style={styles.title}>
          Welcome to Memora
        </AccessibleText>
        <AccessibleText style={styles.description}>
          Memora helps make your photos accessible by automatically adding captions
          that screen readers can use to describe images.
        </AccessibleText>
        <AccessibleText style={styles.description}>
          To get started, Memora needs access to your photo library to scan images
          and add captions to their metadata.
        </AccessibleText>

        {photoPermission === 'denied' && (
          <AccessibleStatus
            status={getStatusMessage()}
            statusType="error"
            style={styles.status}
          />
        )}

        <View style={styles.actions}>
          <AccessibleButton
            label="Allow Photo Access"
            hint="Opens permission dialog to grant photo library access"
            onPress={handleRequestPermission}
            loading={isRequesting}
            style={styles.button}
          />
        </View>

        <AccessibleText style={styles.privacyNote}>
          Your photos are processed on-device by default. Image data only leaves your
          device if you choose to use cloud AI services.
        </AccessibleText>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 17,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  status: {
    marginTop: 16,
  },
  actions: {
    marginTop: 32,
  },
  button: {
    marginBottom: 16,
  },
  privacyNote: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 20,
  },
});
