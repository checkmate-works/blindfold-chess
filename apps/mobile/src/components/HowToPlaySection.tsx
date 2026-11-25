import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme, fontSize, spacing } from "../theme";
import { ListSection } from "./List";

type HowToPlaySectionProps = {
  title: string;
  /** One or two sentences on what the player does. */
  description: string;
  /** The module's demo: a board, pieces, answer buttons. */
  children: ReactNode;
};

/**
 * The "How to Play" section at the top of a setup screen: what the web's
 * `PracticeHowToPlaySection` holds — a centred muted description over the
 * module's demo — on one grouped panel under a caption, like the rest of the
 * app's settings, instead of the web's underlined page heading.
 */
export function HowToPlaySection({
  title,
  description,
  children,
}: HowToPlaySectionProps) {
  const { colors } = useTheme();
  return (
    <ListSection title={title}>
      <View style={styles.body}>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>
          {description}
        </Text>
        {children}
      </View>
    </ListSection>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
  },
  description: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: "center",
  },
});
