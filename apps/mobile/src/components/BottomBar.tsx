import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, spacing } from "../theme";

/**
 * The bar's padding above its content, and below it on a device without a
 * home indicator.
 */
const BAR_PADDING = spacing.md;

type BottomBarProps = {
  children: ReactNode;
  /** Lays out the content: `gap`, `flexDirection: "row"` and the like. */
  style?: StyleProp<ViewStyle>;
};

/**
 * The actions pinned under a screen's scrolling content: a card-coloured
 * bar with a rule on top that runs down to the screen's bottom edge.
 *
 * The bar pads the home indicator's inset itself, in its own colour, with
 * max(inset, 16pt) under the content — the mahjong-scoring app's footer.
 * The screen around it must therefore leave the bottom edge out of its
 * safe area (`<Screen edges={[...]}>` without `"bottom"`). Padded by the
 * screen instead, the inset showed as a strip of page grey under a white
 * bar, and the bar's own padding under the buttons came on top of it.
 */
export function BottomBar({ children, style }: BottomBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, BAR_PADDING),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: spacing.lg,
    paddingTop: BAR_PADDING,
    borderTopWidth: 1,
  },
});
