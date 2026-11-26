import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SectionTitle } from "../../components/SectionTitle";
import { useTheme } from "../../theme";

/** Spaced cards, without the extra frame and row dividers of a grouped list. */
export function PracticeCardSection({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <SectionTitle>{title}</SectionTitle>
      {children}
      {footer && (
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          {footer}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  section: { gap: 12 },
  footer: { fontSize: 13, lineHeight: 18 },
});
