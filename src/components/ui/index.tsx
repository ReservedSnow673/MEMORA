/**
 * Modern UI Components Library
 * Inspired by fitness app design with cards, buttons, badges
 * WCAG 2.1 AA Compliant - Accessible UI Components
 */
import React, { ReactNode, useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Dimensions,
  ActivityIndicator,
  Animated,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  AccessibilityInfo,
  Pressable,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useModernTheme, ModernTheme } from '../../theme';
import * as Haptics from 'expo-haptics';

// Minimum touch target size for WCAG 2.1 AA compliance
const MIN_TOUCH_TARGET = 44;

// Haptic feedback helper
const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'warning' | 'error' = 'light') => {
  try {
    switch (type) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch (e) {
    // Haptics not available
  }
};

// ============= TOAST SYSTEM =============
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastItem: React.FC<{ toast: ToastMessage; onHide: () => void }> = ({ toast, onHide }) => {
  const { theme } = useModernTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    const duration = reduceMotion ? 0 : 300;
    Animated.parallel([
      Animated.spring(opacity, { 
        toValue: 1, 
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(translateY, { 
        toValue: 0, 
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();
    
    // Haptic feedback for toast
    if (toast.type === 'success') triggerHaptic('success');
    else if (toast.type === 'error') triggerHaptic('error');
    else if (toast.type === 'warning') triggerHaptic('warning');
    else triggerHaptic('light');

    const hideTimer = setTimeout(() => {
      const hideDuration = reduceMotion ? 0 : 200;
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: hideDuration, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: hideDuration, useNativeDriver: true }),
      ]).start(onHide);
    }, toast.duration || 3000);

    return () => clearTimeout(hideTimer);
  }, [reduceMotion]);

  const config = {
    success: { icon: 'checkmark-circle' as const, bg: theme.colors.success, color: '#FFFFFF', role: 'Success' },
    error: { icon: 'close-circle' as const, bg: theme.colors.error, color: '#FFFFFF', role: 'Error' },
    warning: { icon: 'warning' as const, bg: theme.colors.warning, color: '#000000', role: 'Warning' },
    info: { icon: 'information-circle' as const, bg: theme.colors.info, color: '#FFFFFF', role: 'Information' },
  };

  const { icon, bg, color, role } = config[toast.type];

  return (
    <Animated.View
      accessible={true}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${role}: ${toast.message}`}
      style={{
        opacity,
        transform: [{ translateY }],
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: bg,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        gap: 10,
        minHeight: MIN_TOUCH_TARGET,
      }}
    >
      <Ionicons name={icon} size={22} color={color} accessibilityElementsHidden={true} />
      <Text 
        style={{ flex: 1, color, fontSize: 15, fontWeight: '500' }}
        accessibilityElementsHidden={true}
      >
        {toast.message}
      </Text>
      <TouchableOpacity 
        onPress={onHide}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
        accessibilityHint="Double tap to dismiss this notification"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="close" size={18} color={color} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View
        style={{
          position: 'absolute',
          top: 60,
          left: 16,
          right: 16,
          zIndex: 9999,
        }}
        pointerEvents="box-none"
      >
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onHide={() => hideToast(toast.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

// ============= EDIT MODAL COMPONENT =============
interface EditModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  value: string;
  onSave: (newValue: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
}

export const EditModal: React.FC<EditModalProps> = ({
  visible,
  onClose,
  title,
  value,
  onSave,
  placeholder = 'Enter text...',
  multiline = true,
  maxLength = 500,
}) => {
  const { theme } = useModernTheme();
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(editValue.trim());
    onClose();
  };

  const charactersRemaining = maxLength - editValue.length;

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      transparent
      accessibilityViewIsModal={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'flex-end',
          }}
          accessible={false}
        >
          <View
            style={{
              backgroundColor: theme.colors.backgroundCard,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 40,
              maxHeight: '80%',
            }}
            accessible={true}
            accessibilityRole="none"
            accessibilityLabel={`${title} editor`}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: theme.colors.textPrimary,
                }}
                accessible={true}
                accessibilityRole="header"
              >
                {title}
              </Text>
              <TouchableOpacity 
                onPress={onClose}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Close editor"
                accessibilityHint="Double tap to close without saving"
                style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Text Input */}
            <TextInput
              value={editValue}
              onChangeText={setEditValue}
              placeholder={placeholder}
              placeholderTextColor={theme.colors.textTertiary}
              multiline={multiline}
              maxLength={maxLength}
              accessible={true}
              accessibilityLabel={`${title} input field`}
              accessibilityHint={`Enter your ${title.toLowerCase()}. ${charactersRemaining} characters remaining`}
              accessibilityValue={{ text: editValue || 'Empty' }}
              style={{
                backgroundColor: theme.colors.surfaceSecondary,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 16,
                fontSize: 16,
                color: theme.colors.textPrimary,
                minHeight: multiline ? 150 : 50,
                textAlignVertical: 'top',
                marginBottom: 12,
              }}
            />

            {/* Character count - accessible */}
            <Text
              style={{
                fontSize: 12,
                color: charactersRemaining < 50 ? theme.colors.warning : theme.colors.textTertiary,
                textAlign: 'right',
                marginBottom: 20,
              }}
              accessible={true}
              accessibilityLabel={`${editValue.length} of ${maxLength} characters used, ${charactersRemaining} remaining`}
              accessibilityLiveRegion="polite"
            >
              {editValue.length}/{maxLength}
            </Text>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                title="Cancel"
                onPress={onClose}
                variant="secondary"
                style={{ flex: 1 }}
                accessibilityHint="Double tap to close without saving changes"
              />
              <Button
                title="Save"
                onPress={handleSave}
                variant="primary"
                style={{ flex: 1 }}
                accessibilityHint="Double tap to save your changes"
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============= CARD COMPONENT =============
interface CardProps {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'default' | 'elevated' | 'outlined';
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'none';
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  style, 
  variant = 'default', 
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
}) => {
  const { theme } = useModernTheme();
  const styles = createCardStyles(theme, variant);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const content = <View style={[styles.card, style]}>{children}</View>;

  if (onPress) {
    return (
      <Pressable 
        onPress={() => {
          triggerHaptic('light');
          onPress();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessible={true}
        accessibilityRole={accessibilityRole || "button"}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          {content}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <View 
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityRole || "none"}
      accessibilityLabel={accessibilityLabel}
    >
      {content}
    </View>
  );
};

const createCardStyles = (theme: ModernTheme, variant: string) =>
  StyleSheet.create({
    card: {
      backgroundColor: variant === 'elevated' ? theme.colors.backgroundElevated : theme.colors.backgroundCard,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      borderWidth: variant === 'outlined' ? 1 : 0,
      borderColor: theme.colors.border,
      ...(variant === 'elevated' ? theme.shadows.md : {}),
    },
  });

// ============= BUTTON COMPONENT =============
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { theme } = useModernTheme();
  const styles = createButtonStyles(theme, variant, size, fullWidth, disabled);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;
  
  // Ensure minimum touch target height for WCAG compliance
  const minHeight = Math.max(size === 'sm' ? 36 : size === 'lg' ? 52 : MIN_TOUCH_TARGET, MIN_TOUCH_TARGET);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePress = () => {
    triggerHaptic(variant === 'primary' ? 'medium' : 'light');
    onPress();
  };

  const getAccessibilityState = () => {
    const state: { disabled?: boolean; busy?: boolean } = {};
    if (disabled) state.disabled = true;
    if (loading) state.busy = true;
    return state;
  };

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator 
          color={variant === 'primary' ? theme.colors.textInverse : theme.colors.accent} 
          size="small"
          accessibilityElementsHidden={true}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons 
              name={icon} 
              size={iconSize} 
              color={styles.text.color as string} 
              style={{ marginRight: 8 }}
              accessibilityElementsHidden={true}
            />
          )}
          <Text style={styles.text} accessibilityElementsHidden={true}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <Ionicons 
              name={icon} 
              size={iconSize} 
              color={styles.text.color as string} 
              style={{ marginLeft: 8 }}
              accessibilityElementsHidden={true}
            />
          )}
        </>
      )}
    </>
  );

  const accessibilityProps = {
    accessible: true,
    accessibilityRole: 'button' as const,
    accessibilityLabel: accessibilityLabel || (loading ? `${title}, loading` : title),
    accessibilityHint: accessibilityHint,
    accessibilityState: getAccessibilityState(),
  };

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={style}
        {...accessibilityProps}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <LinearGradient
            colors={disabled ? [theme.colors.surfaceSecondary, theme.colors.surfaceSecondary] : [theme.colors.accentGradientStart, theme.colors.accentGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.button, { minHeight }]}
          >
            {renderContent()}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      {...accessibilityProps}
    >
      <Animated.View style={[styles.button, { minHeight, transform: [{ scale: scaleAnim }] }, style]}>
        {renderContent()}
      </Animated.View>
    </Pressable>
  );
};

const createButtonStyles = (
  theme: ModernTheme,
  variant: string,
  size: string,
  fullWidth: boolean,
  disabled: boolean
) => {
  const paddingY = size === 'sm' ? 8 : size === 'lg' ? 18 : 14;
  const paddingX = size === 'sm' ? 16 : size === 'lg' ? 32 : 24;
  const fontSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  const getBackgroundColor = () => {
    if (disabled) return theme.colors.surfaceSecondary;
    switch (variant) {
      case 'secondary':
        return theme.colors.surfaceSecondary;
      case 'outline':
      case 'ghost':
        return 'transparent';
      default:
        return theme.colors.accent;
    }
  };

  const getTextColor = () => {
    if (disabled) return theme.colors.textTertiary;
    switch (variant) {
      case 'primary':
        return theme.colors.textInverse;
      case 'secondary':
        return theme.colors.textPrimary;
      case 'outline':
      case 'ghost':
        return theme.colors.accent;
      default:
        return theme.colors.textInverse;
    }
  };

  return StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: paddingY,
      paddingHorizontal: paddingX,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: getBackgroundColor(),
      borderWidth: variant === 'outline' ? 2 : 0,
      borderColor: variant === 'outline' ? theme.colors.accent : 'transparent',
      width: fullWidth ? '100%' : undefined,
      opacity: disabled ? 0.6 : 1,
    },
    text: {
      fontSize,
      fontWeight: '600',
      color: getTextColor(),
    },
  });
};

// ============= BADGE COMPONENT =============
interface BadgeProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'sm' | 'md';
  accessibilityLabel?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  label, 
  icon, 
  variant = 'default', 
  size = 'md',
  accessibilityLabel,
}) => {
  const { theme } = useModernTheme();
  const styles = createBadgeStyles(theme, variant, size);

  const getVariantLabel = () => {
    switch (variant) {
      case 'success': return 'Success';
      case 'warning': return 'Warning';
      case 'error': return 'Error';
      case 'info': return 'Information';
      default: return '';
    }
  };

  const computedLabel = accessibilityLabel || `${getVariantLabel()} ${label || ''}`.trim();

  return (
    <View 
      style={styles.badge}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={computedLabel}
    >
      {icon && (
        <Ionicons 
          name={icon} 
          size={size === 'sm' ? 10 : 12} 
          color={styles.text.color as string}
          accessibilityElementsHidden={true}
        />
      )}
      {label && (
        <Text style={styles.text} accessibilityElementsHidden={true}>
          {label}
        </Text>
      )}
    </View>
  );
};

const createBadgeStyles = (theme: ModernTheme, variant: string, size: string) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: theme.colors.successLight, text: theme.colors.success };
      case 'warning':
        return { bg: theme.colors.warningLight, text: theme.colors.warning };
      case 'error':
        return { bg: theme.colors.errorLight, text: theme.colors.error };
      case 'info':
        return { bg: theme.colors.infoLight, text: theme.colors.info };
      default:
        return { bg: theme.colors.surfaceSecondary, text: theme.colors.textSecondary };
    }
  };

  const colors = getColors();
  const padding = size === 'sm' ? 4 : 6;
  const fontSize = size === 'sm' ? 10 : 12;

  return StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: padding,
      paddingHorizontal: padding * 2,
      borderRadius: theme.borderRadius.full,
      backgroundColor: colors.bg,
      gap: 4,
    },
    text: {
      fontSize,
      fontWeight: '600',
      color: colors.text,
    },
  });
};

// ============= STATUS INDICATOR =============
interface StatusIndicatorProps {
  status: 'processed' | 'processing' | 'unprocessed' | 'error';
  showLabel?: boolean;
  accessible?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, showLabel = false, accessible = true }) => {
  const { theme } = useModernTheme();

  const config = {
    processed: { icon: 'checkmark-circle' as const, color: theme.colors.success, label: 'Processed', description: 'Image has been processed successfully' },
    processing: { icon: 'time' as const, color: theme.colors.warning, label: 'Processing', description: 'Image is currently being processed' },
    unprocessed: { icon: 'ellipse-outline' as const, color: theme.colors.textTertiary, label: 'Pending', description: 'Image is waiting to be processed' },
    error: { icon: 'close-circle' as const, color: theme.colors.error, label: 'Error', description: 'There was an error processing this image' },
  };

  const { icon, color, label, description } = config[status] || config.unprocessed;

  // When not accessible, completely hide from screen readers
  if (!accessible) {
    return (
      <View 
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: `${color}20`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={14} color={color} />
        </View>
        {showLabel && (
          <Text style={{ fontSize: 12, color, fontWeight: '500' }}>
            {label}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View 
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${label}. ${description}`}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: `${color}20`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityElementsHidden={true}
      >
        <Ionicons name={icon} size={14} color={color} />
      </View>
      {showLabel && (
        <Text 
          style={{ fontSize: 12, color, fontWeight: '500' }}
          accessibilityElementsHidden={true}
        >
          {label}
        </Text>
      )}
    </View>
  );
};

// ============= SECTION HEADER =============
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
    accessibilityHint?: string;
  };
  headingLevel?: 1 | 2 | 3;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ 
  title, 
  subtitle, 
  action,
  headingLevel = 2,
}) => {
  const { theme } = useModernTheme();

  return (
    <View 
      style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: theme.spacing.md,
      }}
      accessible={false}
    >
      <View accessible={true} accessibilityRole="header">
        <Text style={{ 
          fontSize: theme.typography.fontSize.xl, 
          fontWeight: '700', 
          color: theme.colors.textPrimary 
        }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ 
            fontSize: theme.typography.fontSize.sm, 
            color: theme.colors.textSecondary,
            marginTop: 2,
          }}>
            {subtitle}
          </Text>
        )}
      </View>
      {action && (
        <TouchableOpacity 
          onPress={action.onPress}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityHint={action.accessibilityHint || `Double tap to ${action.label.toLowerCase()}`}
          style={{ 
            minHeight: MIN_TOUCH_TARGET, 
            minWidth: MIN_TOUCH_TARGET,
            justifyContent: 'center',
            alignItems: 'flex-end',
            paddingLeft: 12,
          }}
        >
          <Text style={{ 
            fontSize: theme.typography.fontSize.md, 
            fontWeight: '600', 
            color: theme.colors.accent 
          }}>
            {action.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ============= STAT CARD =============
interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  accessibilityLabel?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  icon, 
  value, 
  label, 
  trend,
  accessibilityLabel,
}) => {
  const { theme } = useModernTheme();

  const getTrendDescription = () => {
    if (!trend) return '';
    return `${trend.isPositive ? 'Increased' : 'Decreased'} by ${trend.value} percent`;
  };

  const computedLabel = accessibilityLabel || `${label}: ${value}. ${getTrendDescription()}`.trim();

  return (
    <Card 
      variant="elevated" 
      style={{ minWidth: 100, alignItems: 'center' }}
      accessibilityLabel={computedLabel}
      accessibilityRole="none"
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: `${theme.colors.accent}20`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: theme.spacing.sm,
        }}
        accessibilityElementsHidden={true}
      >
        <Ionicons name={icon} size={20} color={theme.colors.accent} />
      </View>
      <Text 
        style={{ 
          fontSize: theme.typography.fontSize.xxl, 
          fontWeight: '700', 
          color: theme.colors.textPrimary,
        }}
        accessibilityElementsHidden={true}
      >
        {value}
      </Text>
      <Text 
        style={{ 
          fontSize: theme.typography.fontSize.sm, 
          color: theme.colors.textSecondary,
          marginTop: 2,
        }}
        accessibilityElementsHidden={true}
      >
        {label}
      </Text>
      {trend && (
        <View 
          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}
          accessibilityElementsHidden={true}
        >
          <Ionicons 
            name={trend.isPositive ? 'arrow-up' : 'arrow-down'} 
            size={12} 
            color={trend.isPositive ? theme.colors.success : theme.colors.error} 
          />
          <Text style={{ 
            fontSize: 10, 
            color: trend.isPositive ? theme.colors.success : theme.colors.error,
            marginLeft: 2,
          }}>
            {trend.value}%
          </Text>
        </View>
      )}
    </Card>
  );
};

// ============= TOGGLE ROW =============
interface ToggleRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityHint?: string;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({ 
  icon, 
  title, 
  subtitle, 
  value, 
  onValueChange,
  accessibilityHint,
}) => {
  const { theme } = useModernTheme();

  const handleValueChange = (newValue: boolean) => {
    // Haptic feedback on toggle
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(newValue);
  };

  return (
    <View 
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        minHeight: 60, // Ensure adequate spacing
      }}
      accessible={false}
    >
      <View 
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: theme.colors.surfaceSecondary,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.md,
        }}
        accessibilityElementsHidden={true}
      >
        <Ionicons name={icon} size={20} color={theme.colors.accent} />
      </View>
      <View style={{ flex: 1 }} accessible={false}>
        <Text 
          style={{ 
            fontSize: theme.typography.fontSize.lg, 
            fontWeight: '500', 
            color: theme.colors.textPrimary 
          }}
          accessibilityElementsHidden={true}
        >
          {title}
        </Text>
        {subtitle && (
          <Text 
            style={{ 
              fontSize: theme.typography.fontSize.sm, 
              color: theme.colors.textSecondary,
              marginTop: 2,
            }}
            accessibilityElementsHidden={true}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {/* Using native Switch for better accessibility support */}
      <Switch
        value={value}
        onValueChange={handleValueChange}
        trackColor={{ 
          false: theme.colors.surfaceSecondary, 
          true: theme.colors.accent 
        }}
        thumbColor={theme.colors.textPrimary}
        ios_backgroundColor={theme.colors.surfaceSecondary}
        accessible={true}
        accessibilityRole="switch"
        accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`}
        accessibilityState={{ checked: value }}
        accessibilityHint={accessibilityHint || `Double tap to ${value ? 'disable' : 'enable'} ${title.toLowerCase()}`}
        style={{
          transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }], // Slightly larger for touch
        }}
      />
    </View>
  );
};

// ============= EMPTY STATE =============
interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  action?: {
    label: string;
    onPress: () => void;
    accessibilityHint?: string;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle, action }) => {
  const { theme } = useModernTheme();

  return (
    <View 
      style={{ 
        flex: 1, 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: theme.spacing.xl,
      }}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${subtitle}`}
    >
      <View 
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: theme.colors.surfaceSecondary,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: theme.spacing.lg,
        }}
        accessibilityElementsHidden={true}
      >
        <Ionicons name={icon} size={40} color={theme.colors.textTertiary} />
      </View>
      <Text 
        style={{ 
          fontSize: theme.typography.fontSize.xl, 
          fontWeight: '700', 
          color: theme.colors.textPrimary,
          textAlign: 'center',
          marginBottom: theme.spacing.sm,
        }}
        accessibilityElementsHidden={true}
      >
        {title}
      </Text>
      <Text 
        style={{ 
          fontSize: theme.typography.fontSize.md, 
          color: theme.colors.textSecondary,
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: theme.spacing.lg,
        }}
        accessibilityElementsHidden={true}
      >
        {subtitle}
      </Text>
      {action && (
        <Button 
          title={action.label} 
          onPress={action.onPress} 
          icon="add-circle-outline"
          accessibilityHint={action.accessibilityHint || `Double tap to ${action.label.toLowerCase()}`}
        />
      )}
    </View>
  );
};

// ============= PROGRESS RING =============
interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  accessibilityLabel?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({ 
  progress, 
  size = 60, 
  strokeWidth = 6,
  showPercentage = true,
  accessibilityLabel,
}) => {
  const { theme } = useModernTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  const roundedProgress = Math.round(progress);
  const computedLabel = accessibilityLabel || `Progress: ${roundedProgress} percent complete`;

  return (
    <View 
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={computedLabel}
      accessibilityValue={{ min: 0, max: 100, now: roundedProgress }}
    >
      <View 
        style={{ 
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: theme.colors.surfaceSecondary,
        }}
        accessibilityElementsHidden={true}
      />
      <View 
        style={{ 
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: theme.colors.accent,
          borderLeftColor: 'transparent',
          borderBottomColor: progress > 25 ? theme.colors.accent : 'transparent',
          borderRightColor: progress > 50 ? theme.colors.accent : 'transparent',
          borderTopColor: progress > 75 ? theme.colors.accent : 'transparent',
          transform: [{ rotate: '-90deg' }],
        }}
        accessibilityElementsHidden={true}
      />
      {showPercentage && (
        <Text 
          style={{ 
            fontSize: size * 0.25, 
            fontWeight: '700', 
            color: theme.colors.textPrimary,
          }}
          accessibilityElementsHidden={true}
        >
          {roundedProgress}%
        </Text>
      )}
    </View>
  );
};

// ============= ICON BUTTON (WCAG Compliant) =============
interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
  style?: ViewStyle;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 'md',
  variant = 'ghost',
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}) => {
  const { theme } = useModernTheme();
  
  // Ensure WCAG minimum touch target of 44x44
  const dimensions = {
    sm: Math.max(36, MIN_TOUCH_TARGET),
    md: MIN_TOUCH_TARGET,
    lg: 56,
  };
  
  const iconSizes = {
    sm: 18,
    md: 22,
    lg: 28,
  };
  
  const touchSize = dimensions[size];
  const iconSize = iconSizes[size];
  
  const getBackgroundColor = () => {
    if (disabled) return theme.colors.surfaceSecondary;
    switch (variant) {
      case 'primary': return theme.colors.accent;
      case 'secondary': return theme.colors.surfaceSecondary;
      case 'ghost': return 'transparent';
      default: return 'transparent';
    }
  };
  
  const getIconColor = () => {
    if (disabled) return theme.colors.textTertiary;
    switch (variant) {
      case 'primary': return theme.colors.textInverse;
      case 'secondary': return theme.colors.textPrimary;
      case 'ghost': return theme.colors.accent;
      default: return theme.colors.accent;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={[
        {
          width: touchSize,
          height: touchSize,
          borderRadius: touchSize / 2,
          backgroundColor: getBackgroundColor(),
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Ionicons 
        name={icon} 
        size={iconSize} 
        color={getIconColor()}
        accessibilityElementsHidden={true}
      />
    </TouchableOpacity>
  );
};

// ============= ACCESSIBLE LINK TEXT =============
interface LinkTextProps {
  children: string;
  onPress: () => void;
  accessibilityHint?: string;
  style?: TextStyle;
}

export const LinkText: React.FC<LinkTextProps> = ({
  children,
  onPress,
  accessibilityHint,
  style,
}) => {
  const { theme } = useModernTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      accessible={true}
      accessibilityRole="link"
      accessibilityLabel={children}
      accessibilityHint={accessibilityHint}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text
        style={[
          {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.md,
            textDecorationLine: 'underline',
          },
          style,
        ]}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
};

// ============= SCREEN READER ANNOUNCEMENT =============
// Utility component for announcing dynamic content changes
interface AnnouncementProps {
  message: string;
  priority?: 'polite' | 'assertive';
}

export const ScreenReaderAnnouncement: React.FC<AnnouncementProps> = ({
  message,
  priority = 'polite',
}) => {
  return (
    <View
      accessible={true}
      accessibilityLiveRegion={priority}
      accessibilityLabel={message}
      style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}
    >
      <Text>{message}</Text>
    </View>
  );
};

// ============= SKIP LINK (for keyboard navigation) =============
interface SkipLinkProps {
  targetRef: React.RefObject<View>;
  label?: string;
}

export const SkipLink: React.FC<SkipLinkProps> = ({
  targetRef,
  label = 'Skip to main content',
}) => {
  const { theme } = useModernTheme();

  const handlePress = () => {
    targetRef.current?.focus();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      accessible={true}
      accessibilityRole="link"
      accessibilityLabel={label}
      style={{
        position: 'absolute',
        top: -100, // Hidden visually but accessible
        left: 0,
        right: 0,
        backgroundColor: theme.colors.accent,
        padding: 16,
        zIndex: 9999,
      }}
    >
      <Text style={{ color: theme.colors.textInverse, textAlign: 'center' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};
