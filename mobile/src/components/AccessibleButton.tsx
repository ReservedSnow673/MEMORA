import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Text,
  StyleSheet,
  AccessibilityRole,
  View,
} from 'react-native';

export interface AccessibleButtonProps extends Omit<TouchableOpacityProps, 'accessibilityRole'> {
  label: string;
  hint?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

export function AccessibleButton({
  label,
  hint,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  ...props
}: AccessibleButtonProps): React.ReactElement {
  const buttonStyle = [
    styles.button,
    styles[variant],
    disabled && styles.disabled,
    style,
  ];

  const accessibilityState = {
    disabled: disabled || loading,
    busy: loading,
  };

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={accessibilityState}
      accessible={true}
      {...props}
    >
      <Text style={[styles.buttonText, disabled && styles.disabledText]}>
        {loading ? 'Loading...' : label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 48,
  },
  primary: {
    backgroundColor: '#007AFF',
  },
  secondary: {
    backgroundColor: '#E5E5EA',
  },
  danger: {
    backgroundColor: '#FF3B30',
  },
  disabled: {
    backgroundColor: '#C7C7CC',
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledText: {
    color: '#8E8E93',
  },
});
