import type { ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { spacing } from "../theme";

type Props = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * The scroll view of a tab's entry screen.
 *
 * `contentInsetAdjustmentBehavior="automatic"` lets iOS inset the content
 * by the native header above and the tab bar below — the bar floats over
 * the content (translucent on iOS 18, Liquid Glass on iOS 26), so a plain
 * scroll view would end with its last row behind it. Android lays the
 * content out above its opaque bar, so the prop is a no-op there.
 */
export function TabScrollView({ children, contentContainerStyle }: Props) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={styles.scroll}
      contentContainerStyle={[styles.content, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
});
