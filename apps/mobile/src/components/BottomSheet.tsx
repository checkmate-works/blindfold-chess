import { BottomSheet as NativeBottomSheet, RNHostView } from "@expo/ui";
import type { ReactNode } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { useTheme, fontSize, fontWeight, spacing } from "../theme";

/**
 * The tall sheet's height, as a share of the screen, and the cap on a sheet
 * sized to its content. Some of the screen stays visible above it, so it
 * reads as a layer laid over the screen for a moment.
 */
const TALL_HEIGHT_RATIO = 0.85;

type BottomSheetProps = {
  visible: boolean;
  /** A tap on the backdrop, a drag down, or the Android back button. */
  onClose: () => void;
  /** Heading in the sheet's top row. */
  title?: string;
  /**
   * - `content` — as tall as the content, up to 85% of the screen. Option
   *   lists and short notes.
   * - `tall` — a fixed height the body fills, so switching what is inside
   *   (help pages) does not move the top edge. 85% of the screen on iOS,
   *   full screen on Android (a Material 3 sheet rests only at half and
   *   full, and half is too cramped for a page of text).
   */
  size?: "content" | "tall";
  /** Pinned under the scrolling body (e.g. a primary button). */
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * A sheet that slides up from the bottom — the half-modal most apps use for
 * option lists, short explanations and help.
 *
 * @description
 * The sheet is the platform's own (`@expo/ui`'s `BottomSheet`: SwiftUI's
 * `.sheet` on iOS, Material 3's `ModalBottomSheet` on Android), so the drag
 * down, the fling, pulling down once the body has scrolled back to the top,
 * the closing motion, the backdrop and the grabber all behave the way each
 * platform's own sheets do. It replaced a `Modal` + `PanResponder` sheet
 * that only took the drag on its top row (pulling the body did nothing) and
 * closed on a fixed-time easing instead of carrying on at the speed the
 * finger let go.
 *
 * It is a component opened in place with `visible`, not a route: expo-router's
 * `formSheet` presentation is for a screen of its own, and does not suit a
 * picker that opens over its row and hands a value back. It works inside the
 * full-screen session modal too.
 *
 * The React Native content goes into the native sheet through `RNHostView`.
 * Sized to its content, `matchContents` hands the content's Yoga height to
 * the sheet; on iOS a fractional detent does not pass its height down to the
 * content (it lays out at full height and the footer falls off the sheet),
 * so the tall sheet also sizes from its content, which fixes its own height.
 * On Android the tall sheet is full screen and the content fills it.
 *
 * The sheet leaves room for the home indicator and the navigation bar
 * itself, so adding `useSafeAreaInsets().bottom` would double it. It also
 * moves out of the keyboard's way itself.
 *
 * The backdrop is drawn by the OS and takes no accessibility label; closing
 * is the platform's (VoiceOver's two-finger scrub, Android's back), so a
 * sheet's content should still offer a close or done button of its own.
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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const sizesFromContent = Platform.OS === "ios" || size === "content";

  return (
    <NativeBottomSheet
      isPresented={visible}
      onDismiss={onClose}
      snapPoints={sizesFromContent ? undefined : ["full"]}
      contentPadding={0}
      containerColor={colors.card}
    >
      <RNHostView matchContents={sizesFromContent}>
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            // Sized to its content, the width is measured as fit-content too
            // and paragraphs would run sideways without wrapping.
            { width: windowWidth },
            size === "content"
              ? { maxHeight: windowHeight * TALL_HEIGHT_RATIO }
              : sizesFromContent
                ? { height: windowHeight * TALL_HEIGHT_RATIO }
                : styles.fill,
          ]}
        >
          {title ? (
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: colors.foreground }]}
            >
              {title}
            </Text>
          ) : null}
          <ScrollView
            style={size === "content" ? styles.bodyContent : styles.fill}
            contentContainerStyle={styles.body}
          >
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </RNHostView>
    </NativeBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    // The OS draws the grabber; the title sits under it.
    paddingTop: Platform.OS === "ios" ? spacing.lg : 0,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  bodyContent: {
    flexGrow: 0,
    flexShrink: 1,
  },
  body: {
    paddingHorizontal: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.lg,
  },
  fill: {
    flex: 1,
  },
});
