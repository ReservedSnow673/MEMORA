import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

export interface AccessibleTextProps extends TextProps {
  children: React.ReactNode;
  role?: 'header' | 'text' | 'alert' | 'summary';
  level?: 1 | 2 | 3 | 4;
}

export function AccessibleText({
  children,
  role = 'text',
  level,
  style,
  ...props
}: AccessibleTextProps): React.ReactElement {
  const textStyle = [
    styles.base,
    role === 'header' && level && styles[`heading${level}`],
    role === 'alert' && styles.alert,
    style,
  ];

  const accessibilityRole = role === 'header' ? 'header' : role === 'alert' ? 'alert' : 'text';

  return (
    <Text
      style={textStyle}
      accessibilityRole={accessibilityRole}
      accessible={true}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontSize: 17,
    color: '#000000',
  },
  heading1: {
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  heading2: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  heading3: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  heading4: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  alert: {
    fontSize: 17,
    color: '#FF3B30',
    fontWeight: '500',
  },
});
