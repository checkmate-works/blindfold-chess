import { StyleSheet, Text } from "react-native";

import { useTheme, fontSize, fontWeight, spacing } from "../theme";

type SectionTitleProps = {
  children: string;
};

/**
 * A setup screen's section heading — "How to Play", "Game Settings" — the
 * web's `SectionTitle`: medium weight at 16pt over a full-width rule, so the
 * sections read as a document rather than as boxed cards.
 */
export function SectionTitle({ children }: SectionTitleProps) {
  const { colors } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={[
        styles.title,
        { color: colors.foreground, borderBottomColor: colors.border },
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
