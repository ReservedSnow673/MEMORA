import React from 'react';
import { View, Switch, StyleSheet, ViewProps } from 'react-native';
import { AccessibleText } from './AccessibleText';

export interface AccessibleToggleProps extends ViewProps {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function AccessibleToggle({
  label,
  hint,
  value,
  onValueChange,
  disabled = false,
  style,
  ...props
}: AccessibleToggleProps): React.ReactElement {
  const accessibilityLabel = `${label}, ${value ? 'on' : 'off'}`;
  const accessibilityHint = hint ?? `Double tap to toggle ${label}`;

  return (
    <View style={[styles.container, style]} {...props}>
      <AccessibleText style={styles.label}>{label}</AccessibleText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityRole="switch"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ checked: value, disabled }}
        trackColor={{ false: '#C7C7CC', true: '#34C759' }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#C7C7CC"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  label: {
    flex: 1,
    marginRight: 16,
  },
});
