import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewProps } from 'react-native';
import { AccessibleText } from './AccessibleText';

export interface RadioOption<T> {
  value: T;
  label: string;
  hint?: string;
}

export interface AccessibleRadioGroupProps<T> extends ViewProps {
  label: string;
  options: RadioOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  disabled?: boolean;
}

export function AccessibleRadioGroup<T extends string>({
  label,
  options,
  value,
  onValueChange,
  disabled = false,
  style,
  ...props
}: AccessibleRadioGroupProps<T>): React.ReactElement {
  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      {...props}
    >
      <AccessibleText style={styles.groupLabel} role="header" level={4}>
        {label}
      </AccessibleText>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.option, isSelected && styles.selectedOption]}
            onPress={() => onValueChange(option.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityHint={option.hint ?? `Select ${option.label}`}
            accessibilityState={{ checked: isSelected, disabled }}
          >
            <View style={[styles.radio, isSelected && styles.radioSelected]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
            <AccessibleText style={styles.optionLabel}>{option.label}</AccessibleText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  groupLabel: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  selectedOption: {
    backgroundColor: '#E5F1FF',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioSelected: {
    borderColor: '#007AFF',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  optionLabel: {
    flex: 1,
  },
});
