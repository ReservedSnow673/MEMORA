import React, { useEffect, useRef } from 'react';
import {
  View,
  ViewProps,
  StyleSheet,
  AccessibilityInfo,
  findNodeHandle,
} from 'react-native';
import { AccessibleText } from './AccessibleText';

export interface AccessibleStatusProps extends ViewProps {
  status: string;
  statusType: 'info' | 'success' | 'warning' | 'error';
  announceOnChange?: boolean;
}

export function AccessibleStatus({
  status,
  statusType,
  announceOnChange = true,
  style,
  ...props
}: AccessibleStatusProps): React.ReactElement {
  const prevStatus = useRef(status);
  const viewRef = useRef<View>(null);

  useEffect(() => {
    if (announceOnChange && status !== prevStatus.current) {
      AccessibilityInfo.announceForAccessibility(status);
      prevStatus.current = status;
    }
  }, [status, announceOnChange]);

  const containerStyle = [
    styles.container,
    styles[statusType],
    style,
  ];

  return (
    <View
      ref={viewRef}
      style={containerStyle}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessible={true}
      accessibilityLabel={`Status: ${status}`}
      {...props}
    >
      <AccessibleText role="alert">{status}</AccessibleText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  info: {
    backgroundColor: '#E5F1FF',
  },
  success: {
    backgroundColor: '#E5FFE5',
  },
  warning: {
    backgroundColor: '#FFF8E5',
  },
  error: {
    backgroundColor: '#FFE5E5',
  },
});
