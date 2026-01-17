import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import AccessibleText from './AccessibleText';
import {
  formatAccessibleProgress,
  formatAccessibleDuration,
  useAnnouncement,
} from '../utils/accessibility';

interface AccessibleProgressProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  showCount?: boolean;
  showETA?: boolean;
  estimatedTimeRemainingMs?: number;
  announceInterval?: number;
  color?: string;
  backgroundColor?: string;
  height?: number;
  testID?: string;
}

const AccessibleProgress: React.FC<AccessibleProgressProps> = ({
  current,
  total,
  label,
  showPercentage = true,
  showCount = false,
  showETA = false,
  estimatedTimeRemainingMs,
  announceInterval = 25,
  color = '#007AFF',
  backgroundColor = '#E5E5E5',
  height = 8,
  testID,
}) => {
  const announce = useAnnouncement();
  const lastAnnouncedRef = useRef<number>(0);
  const animatedWidth = useRef(new Animated.Value(0)).current;

  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: percentage,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [percentage, animatedWidth]);

  useEffect(() => {
    if (percentage === 100 && lastAnnouncedRef.current !== 100) {
      announce('Processing complete');
      lastAnnouncedRef.current = 100;
    } else if (percentage - lastAnnouncedRef.current >= announceInterval) {
      announce(`${percentage} percent complete`);
      lastAnnouncedRef.current = percentage;
    }
  }, [percentage, announce, announceInterval]);

  const accessibilityLabel = formatAccessibleProgress(current, total);
  const etaLabel = showETA && estimatedTimeRemainingMs
    ? `. About ${formatAccessibleDuration(estimatedTimeRemainingMs)} remaining`
    : '';

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={`${label ? `${label}. ` : ''}${accessibilityLabel}${etaLabel}`}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: percentage,
        text: `${percentage}%`,
      }}
      testID={testID}
    >
      {label && (
        <AccessibleText style={styles.label} role="text">
          {label}
        </AccessibleText>
      )}

      <View style={[styles.trackContainer, { height, backgroundColor }]}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: color,
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      <View style={styles.infoContainer}>
        {showPercentage && (
          <AccessibleText style={styles.percentageText} role="text">
            {percentage}%
          </AccessibleText>
        )}

        {showCount && (
          <AccessibleText style={styles.countText} role="text">
            {current} / {total}
          </AccessibleText>
        )}

        {showETA && estimatedTimeRemainingMs != null && (
          <AccessibleText style={styles.etaText} role="text">
            ~{formatAccessibleDuration(estimatedTimeRemainingMs)} remaining
          </AccessibleText>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  trackContainer: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  percentageText: {
    fontSize: 12,
    color: '#666',
  },
  countText: {
    fontSize: 12,
    color: '#666',
  },
  etaText: {
    fontSize: 12,
    color: '#666',
  },
});

export default AccessibleProgress;
