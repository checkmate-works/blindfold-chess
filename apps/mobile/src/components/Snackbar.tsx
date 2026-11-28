import { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  borderRadius,
  controlLabel,
  fontSize,
  spacing,
  touchTarget,
  useTheme,
} from "../theme";

/** How long the snackbar stays, as Material's snackbar does by default. */
const DURATION_MS = 4000;

/**
 * How long it stays while a screen reader is on. The message is read out
 * when it appears, but reaching the action button by swiping takes longer
 * than four seconds.
 */
const SCREEN_READER_DURATION_MS = 10000;

/** The slide up and fade in, and the same back out. */
const ANIMATION_MS = 200;

/** How far below its place the snackbar starts. */
const SLIDE_DISTANCE = 16;

type Props = {
  message: string;
  /** The one action's label. A snackbar has at most one. */
  actionLabel?: string;
  /** Runs on the action's press; the snackbar then goes away. */
  onAction?: () => void;
  /** Called once the snackbar has gone, by its timeout or by the action. */
  onDismiss: () => void;
};

/**
 * A short message along the bottom of the screen that goes away on its own,
 * with at most one action — Material's snackbar, the form mail apps use
 * for "Draft saved" when their compose screen is closed. iOS has no system
 * counterpart, so it is drawn the same on both platforms.
 *
 * @description
 * Render it while there is something to say, as the last child of a
 * container that spans the area it should float over; it lays itself over
 * that container's bottom edge without moving anything in it. It keeps
 * clear of the home indicator and, on iOS, the tab bar on its own: it sits
 * in a `SafeAreaView`, whose inset is measured natively against the frame
 * it is actually laid out in, so the same component works over a tab, a
 * pushed screen, or the space above a `BottomBar` (where the inset is 0).
 *
 * The message is announced to screen readers as it appears, and the
 * snackbar then stays longer, so the action can still be reached.
 */
export function Snackbar({ message, actionLabel, onAction, onDismiss }: Props) {
  const { colors } = useTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const dismissedRef = useRef(false);
  // The latest handler, so a parent re-render does not restart the timer.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const hide = useRef(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    Animated.timing(progress, {
      toValue: 0,
      duration: ANIMATION_MS,
      useNativeDriver: true,
    }).start(() => onDismissRef.current());
  }).current;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    Animated.timing(progress, {
      toValue: 1,
      duration: ANIMATION_MS,
      useNativeDriver: true,
    }).start();
    AccessibilityInfo.announceForAccessibility(message);
    void AccessibilityInfo.isScreenReaderEnabled()
      .catch(() => false)
      .then((screenReader) => {
        if (!active) return;
        timer = setTimeout(
          hide,
          screenReader ? SCREEN_READER_DURATION_MS : DURATION_MS,
        );
      });
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
    // Shown once per mount: a new message is a new snackbar (give it a key).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAction = () => {
    onAction?.();
    hide();
  };

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      pointerEvents="box-none"
      style={styles.host}
    >
      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: colors.snackbar,
            opacity: progress,
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [SLIDE_DISTANCE, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text
          style={[styles.message, { color: colors.snackbarForeground }]}
          testID="snackbar-message"
        >
          {message}
        </Text>
        {actionLabel && onAction && (
          <Pressable
            onPress={handleAction}
            accessibilityRole="button"
            testID="snackbar-action"
            style={({ pressed }) => [
              styles.action,
              pressed && { backgroundColor: colors.snackbarPressed },
            ]}
          >
            <Text
              style={[styles.actionLabel, { color: colors.snackbarAction }]}
            >
              {actionLabel}
            </Text>
          </Pressable>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    minHeight: 48,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 20,
    paddingVertical: spacing.sm,
  },
  action: {
    minHeight: touchTarget.minSize,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: controlLabel.fontSize,
    lineHeight: controlLabel.lineHeight,
    fontWeight: controlLabel.fontWeight,
  },
});
