import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, fontSize, fontWeight, spacing } from "../theme";

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Heading in the sheet's top row. */
  title?: string;
  /**
   * `content` sizes to the content (up to 60% of the screen) — option lists
   * and short notes. `tall` takes 90% — help pages and longer text.
   */
  size?: "content" | "tall";
  /** Pinned under the scrolling body (e.g. a primary button). */
  footer?: ReactNode;
  children: ReactNode;
};

/** Drag distance (pt) or fling speed past which releasing the grabber closes. */
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 1.2;

/**
 * A sheet that slides up from the bottom over a dimmed backdrop — the
 * half-modal most apps use for option lists, short explanations and help.
 *
 * @description
 * Closes on a tap on the backdrop, on the Android back button
 * (`onRequestClose`) and on dragging the top row (grabber and title) down.
 * Only the top row takes the drag, so the body can scroll freely; this is
 * how the system sheets behave once their content scrolls.
 *
 * Built on `Modal` + `Animated` rather than the platform sheet so it can sit
 * inside any screen — including the full-screen session modal — and size to
 * its content on both platforms (the Android form sheet only has half and
 * full heights). For a sheet that is a route of its own, use the root
 * stack's `formSheet` presentation instead.
 *
 * The sheet itself has no border or shadow; the dimmed backdrop lifts it,
 * matching the flat style of the rest of the app.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  size = "content",
  footer,
  children,
}: BottomSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  // Stays mounted through the closing animation, then unmounts the Modal.
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(windowHeight)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(windowHeight);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: windowHeight,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
    // `mounted` is read only to skip the close animation on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, windowHeight, translateY, backdrop]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderMove: (_, g) => {
        translateY.setValue(Math.max(0, g.dy));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY) {
          onCloseRef.current();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            bounciness: 4,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  if (!mounted) return null;

  const maxHeight = windowHeight * (size === "tall" ? 0.9 : 0.6);

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        style={[styles.backdrop, { opacity: backdrop }]}
        pointerEvents="box-none"
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={title}
        />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            paddingBottom: Math.max(insets.bottom, spacing.md),
            transform: [{ translateY }],
          },
          size === "tall" ? { height: maxHeight } : { maxHeight },
        ]}
      >
        <View {...panResponder.panHandlers} style={styles.dragArea}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          {title ? (
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: colors.foreground }]}
            >
              {title}
            </Text>
          ) : null}
        </View>
        <ScrollView
          style={size === "tall" ? styles.bodyTall : undefined}
          contentContainerStyle={styles.body}
          bounces={false}
        >
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  dragArea: {
    alignItems: "center",
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    alignSelf: "stretch",
    textAlign: "center",
  },
  bodyTall: {
    flex: 1,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
