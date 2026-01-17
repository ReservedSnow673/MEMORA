import { AccessibilityInfo, Platform } from 'react-native';
import { useEffect, useState, useCallback, useRef } from 'react';

export interface AccessibilityState {
  screenReaderEnabled: boolean;
  reduceMotionEnabled: boolean;
  boldTextEnabled: boolean;
  grayscaleEnabled: boolean;
  invertColorsEnabled: boolean;
  reduceTransparencyEnabled: boolean;
}

export function useAccessibilityState(): AccessibilityState {
  const [state, setState] = useState<AccessibilityState>({
    screenReaderEnabled: false,
    reduceMotionEnabled: false,
    boldTextEnabled: false,
    grayscaleEnabled: false,
    invertColorsEnabled: false,
    reduceTransparencyEnabled: false,
  });

  useEffect(() => {
    const fetchInitialState = async () => {
      const [
        screenReader,
        reduceMotion,
        boldText,
        grayscale,
        invertColors,
        reduceTransparency,
      ] = await Promise.all([
        AccessibilityInfo.isScreenReaderEnabled(),
        AccessibilityInfo.isReduceMotionEnabled(),
        Platform.OS === 'ios' ? AccessibilityInfo.isBoldTextEnabled() : Promise.resolve(false),
        Platform.OS === 'ios' ? AccessibilityInfo.isGrayscaleEnabled() : Promise.resolve(false),
        Platform.OS === 'ios' ? AccessibilityInfo.isInvertColorsEnabled() : Promise.resolve(false),
        Platform.OS === 'ios' ? AccessibilityInfo.isReduceTransparencyEnabled() : Promise.resolve(false),
      ]);

      setState({
        screenReaderEnabled: screenReader,
        reduceMotionEnabled: reduceMotion,
        boldTextEnabled: boldText,
        grayscaleEnabled: grayscale,
        invertColorsEnabled: invertColors,
        reduceTransparencyEnabled: reduceTransparency,
      });
    };

    fetchInitialState();

    const subscriptions = [
      AccessibilityInfo.addEventListener('screenReaderChanged', (enabled) => {
        setState((prev) => ({ ...prev, screenReaderEnabled: enabled }));
      }),
      AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
        setState((prev) => ({ ...prev, reduceMotionEnabled: enabled }));
      }),
    ];

    if (Platform.OS === 'ios') {
      subscriptions.push(
        AccessibilityInfo.addEventListener('boldTextChanged', (enabled) => {
          setState((prev) => ({ ...prev, boldTextEnabled: enabled }));
        }),
        AccessibilityInfo.addEventListener('grayscaleChanged', (enabled) => {
          setState((prev) => ({ ...prev, grayscaleEnabled: enabled }));
        }),
        AccessibilityInfo.addEventListener('invertColorsChanged', (enabled) => {
          setState((prev) => ({ ...prev, invertColorsEnabled: enabled }));
        }),
        AccessibilityInfo.addEventListener('reduceTransparencyChanged', (enabled) => {
          setState((prev) => ({ ...prev, reduceTransparencyEnabled: enabled }));
        })
      );
    }

    return () => {
      subscriptions.forEach((sub) => sub.remove());
    };
  }, []);

  return state;
}

export function useAnnouncement(): (message: string, options?: AnnouncementOptions) => void {
  const queueRef = useRef<string[]>([]);
  const isAnnouncingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (isAnnouncingRef.current || queueRef.current.length === 0) return;

    isAnnouncingRef.current = true;
    const message = queueRef.current.shift()!;

    try {
      await AccessibilityInfo.announceForAccessibility(message);
      await new Promise((resolve) => setTimeout(resolve, 500));
    } finally {
      isAnnouncingRef.current = false;
      processQueue();
    }
  }, []);

  return useCallback(
    (message: string, options?: AnnouncementOptions) => {
      if (options?.immediate) {
        queueRef.current = [message];
      } else {
        queueRef.current.push(message);
      }
      processQueue();
    },
    [processQueue]
  );
}

export interface AnnouncementOptions {
  immediate?: boolean;
  delay?: number;
}

export function useFocusOnMount(
  ref: React.RefObject<any>,
  delay = 100
): void {
  useEffect(() => {
    const timer = setTimeout(() => {
      ref.current?.focus?.();
    }, delay);

    return () => clearTimeout(timer);
  }, [ref, delay]);
}

export function formatAccessibleTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatAccessibleProgress(current: number, total: number): string {
  const percentage = Math.round((current / total) * 100);
  return `${current} of ${total}, ${percentage} percent complete`;
}

export function formatAccessibleCount(count: number, singular: string, plural?: string): string {
  const pluralForm = plural ?? `${singular}s`;
  if (count === 0) return `no ${pluralForm}`;
  if (count === 1) return `1 ${singular}`;
  return `${count} ${pluralForm}`;
}

export function formatAccessibleDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return `${seconds} seconds`;
  if (minutes < 60) {
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) return `${minutes} minutes`;
    return `${minutes} minutes and ${remainingSeconds} seconds`;
  }

  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} hours`;
  return `${hours} hours and ${remainingMinutes} minutes`;
}

export const accessibilityRole = {
  button: 'button' as const,
  link: 'link' as const,
  image: 'image' as const,
  text: 'text' as const,
  header: 'header' as const,
  search: 'search' as const,
  checkbox: 'checkbox' as const,
  radio: 'radio' as const,
  switch: 'switch' as const,
  adjustable: 'adjustable' as const,
  alert: 'alert' as const,
  progressbar: 'progressbar' as const,
  menu: 'menu' as const,
  menuitem: 'menuitem' as const,
  tab: 'tab' as const,
  tablist: 'tablist' as const,
};

export function getAccessibilityHint(action: string, context?: string): string {
  const contextSuffix = context ? ` for ${context}` : '';
  return `Double tap to ${action}${contextSuffix}`;
}

export function combineAccessibilityLabels(...labels: (string | undefined | null)[]): string {
  return labels.filter(Boolean).join('. ');
}

export function createImageAccessibilityLabel(
  caption: string | undefined,
  hasCaption: boolean,
  isProcessing: boolean
): string {
  if (isProcessing) {
    return 'Image. Caption is being generated.';
  }

  if (!hasCaption || !caption) {
    return 'Image without caption. Double tap to generate caption.';
  }

  return `Image. ${caption}`;
}
