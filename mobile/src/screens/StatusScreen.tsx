import React from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { AccessibleText, AccessibleButton, AccessibleStatus } from '../components';
import { useProcessingStore } from '../store';

type StatusScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Status'>;

interface StatusScreenProps {
  navigation: StatusScreenNavigationProp;
}

export function StatusScreen({ navigation }: StatusScreenProps): React.ReactElement {
  const { stats, currentStatus, setStatus } = useProcessingStore();

  const getStatusMessage = (): string => {
    switch (currentStatus) {
      case 'idle':
        return 'Idle - No active processing';
      case 'scanning':
        return 'Scanning your photo library for images without captions';
      case 'processing':
        return `Processing ${stats.processing} image${stats.processing !== 1 ? 's' : ''}`;
      case 'paused':
        return 'Processing is paused';
      default:
        return 'Unknown status';
    }
  };

  const getStatusType = (): 'info' | 'success' | 'warning' | 'error' => {
    if (stats.failed > 0) return 'warning';
    switch (currentStatus) {
      case 'idle':
        return stats.completed > 0 ? 'success' : 'info';
      case 'scanning':
      case 'processing':
        return 'info';
      case 'paused':
        return 'warning';
      default:
        return 'info';
    }
  };

  const handlePauseResume = () => {
    if (currentStatus === 'paused') {
      setStatus('processing');
    } else if (currentStatus === 'processing') {
      setStatus('paused');
    }
  };

  const canPauseResume = currentStatus === 'processing' || currentStatus === 'paused';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AccessibleStatus
        status={getStatusMessage()}
        statusType={getStatusType()}
        style={styles.status}
      />

      <View style={styles.statsGrid} accessibilityRole="summary">
        <View style={styles.statCard}>
          <AccessibleText style={styles.statValue}>{stats.total}</AccessibleText>
          <AccessibleText style={styles.statLabel}>Total</AccessibleText>
        </View>
        <View style={styles.statCard}>
          <AccessibleText style={styles.statValue}>{stats.completed}</AccessibleText>
          <AccessibleText style={styles.statLabel}>Completed</AccessibleText>
        </View>
        <View style={styles.statCard}>
          <AccessibleText style={styles.statValue}>{stats.pending}</AccessibleText>
          <AccessibleText style={styles.statLabel}>Pending</AccessibleText>
        </View>
        <View style={styles.statCard}>
          <AccessibleText style={styles.statValue}>{stats.failed}</AccessibleText>
          <AccessibleText style={styles.statLabel}>Failed</AccessibleText>
        </View>
      </View>

      {stats.completed > 0 && stats.total > 0 && (
        <View style={styles.progressContainer}>
          <AccessibleText role="header" level={3}>
            Progress
          </AccessibleText>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(stats.completed / stats.total) * 100}%` },
              ]}
            />
          </View>
          <AccessibleText
            accessibilityLabel={`${Math.round((stats.completed / stats.total) * 100)} percent complete`}
          >
            {Math.round((stats.completed / stats.total) * 100)}% complete
          </AccessibleText>
        </View>
      )}

      <View style={styles.actions}>
        {canPauseResume && (
          <AccessibleButton
            label={currentStatus === 'paused' ? 'Resume Processing' : 'Pause Processing'}
            hint={
              currentStatus === 'paused'
                ? 'Resume processing images'
                : 'Pause current processing'
            }
            onPress={handlePauseResume}
            variant={currentStatus === 'paused' ? 'primary' : 'secondary'}
            style={styles.actionButton}
          />
        )}
        {stats.failed > 0 && (
          <AccessibleButton
            label={`Retry ${stats.failed} Failed`}
            hint="Retry processing failed images"
            onPress={() => {}}
            variant="secondary"
            style={styles.actionButton}
          />
        )}
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
  status: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  statCard: {
    width: '50%',
    padding: 6,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    marginVertical: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 12,
  },
});
