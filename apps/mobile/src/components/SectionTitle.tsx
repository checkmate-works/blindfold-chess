import { StyleSheet, Text } from "react-native";
import type { StyleProp, TextStyle } from "react-native";

import { useTheme, fontWeight } from "../theme";

type SectionTitleProps = {
  children: string;
  /** Layout only (margins); the type face is fixed on purpose. */
  style?: StyleProp<TextStyle>;
};

/**
 * The heading of one section of a screen: 19pt, line height 26, weight 700,
 * in ink (`colors.foreground`), announced as a header.
 *
 * @description
 * Sections are told apart by the size of this heading and the space above
 * it, not by divider lines or a small grey caption. The spacing that goes
 * with it: 12 between the heading and its panel, 32 between one section and
 * the next (the `TabScrollView` gap), 20 above the first section.
 *
 * `ListSection` draws its `title` with this component, so every list on
 * every screen gets the same heading without its call site changing; use it
 * directly for a section whose body is not a `ListSection`.
 */
export function SectionTitle({ children, style }: SectionTitleProps) {
  const { colors } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={[styles.title, { color: colors.foreground }, style]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 19,
    lineHeight: 26,
    fontWeight: fontWeight.bold,
  },
});
