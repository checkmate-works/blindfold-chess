import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Edge } from "react-native-safe-area-context";

import { useTheme } from "../theme";

type Props = {
  children: ReactNode;
  /**
   * Which insets the screen respects. Omitted means all four, matching
   * `SafeAreaView`'s own default: a screen inside the tab navigator passes
   * `["top"]` because the tab bar already clears the bottom inset, a screen
   * pushed on top of it passes `["bottom"]` because the header clears the top,
   * and a full-bleed session screen passes nothing.
   */
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
};

/**
 * The outermost element of a screen: fills its parent and paints the theme
 * background behind the safe-area insets.
 *
 * Every screen needs the background painted here rather than on an inner view,
 * because the inset padding belongs to this element — leave it transparent and
 * the notch and home-indicator strips show whatever the navigator put behind
 * them, which is the wrong color in one of the two themes.
 */
export function Screen({ children, edges, style }: Props) {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }, style]}
      edges={edges}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
