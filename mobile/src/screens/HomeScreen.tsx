import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { AccessibleText, AccessibleButton, AccessibleStatus } from '../components';
import { useProcessingStore, usePermissionStore } from '../store';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

export function HomeScreen({ navigation }: HomeScreenProps): React.ReactElement {
  const { stats, currentStatus } = useProcessingStore();
  const { photoPermission } = usePermissionStore();

  const getStatusMessage = (): string => {
    switch (currentStatus) {
      case 'idle':
        return 'Ready to process images';
      case 'scanning':
        return 'Scanning photo library...';
      case 'processing':
        return `Processing images: ${stats.completed} of ${stats.total} completed`;
      case 'paused':
        return 'Processing paused';
      default:
        return 'Unknown status';
    }
  };

  const getStatusType = (): 'info' | 'success' | 'warning' | 'error' => {
    switch (currentStatus) {
      case 'idle':
        return 'info';
      case 'scanning':
      case 'processing':
        return 'info';
      case 'paused':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AccessibleText role="header" level={1}>
        Memora
      </AccessibleText>
      <AccessibleText style={styles.subtitle}>
        Accessibility captions for your photos
      </AccessibleText>

      <AccessibleStatus
        status={getStatusMessage()}
        statusType={getStatusType()}
        style={styles.status}
      />

      <View style={styles.statsContainer} accessibilityRole="summary">
        <AccessibleText role="header" level={3}>
          Processing Statistics
        </AccessibleText>
        <View style={styles.statRow}>
          <AccessibleText>Total images:</AccessibleText>
          <AccessibleText accessibilityLabel={`${stats.total} total images`}>
            {stats.total}
          </AccessibleText>
        </View>
        <View style={styles.statRow}>
          <AccessibleText>Completed:</AccessibleText>
          <AccessibleText accessibilityLabel={`${stats.completed} completed`}>
            {stats.completed}
          </AccessibleText>
        </View>
        <View style={styles.statRow}>
          <AccessibleText>Pending:</AccessibleText>
          <AccessibleText accessibilityLabel={`${stats.pending} pending`}>
            {stats.pending}
          </AccessibleText>
        </View>
        <View style={styles.statRow}>
          <AccessibleText>Failed:</AccessibleText>
          <AccessibleText accessibilityLabel={`${stats.failed} failed`}>
            {stats.failed}
          </AccessibleText>
        </View>
      </View>

      <View style={styles.actions}>
        <AccessibleButton
          label="View Status"
          hint="Opens detailed processing status screen"
          onPress={() => navigation.navigate('Status')}
          style={styles.actionButton}
        />
        <AccessibleButton
          label="Settings"
          hint="Opens settings to configure Memora"
          onPress={() => navigation.navigate('Settings')}
          variant="secondary"
          style={styles.actionButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 17,
    color: '#666666',
    marginTop: 4,
    marginBottom: 20,
  },
  status: {
    marginBottom: 24,
  },
  statsContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 12,
  },
});
