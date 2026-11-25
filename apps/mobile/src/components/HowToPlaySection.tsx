import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme, fontSize, spacing } from "../theme";
import { SectionTitle } from "./SectionTitle";

type HowToPlaySectionProps = {
  title: string;
  /** One or two sentences on what the player does. */
  description: string;
  /** The module's demo: a board, pieces, answer buttons. */
  children: ReactNode;
};

/**
 * The "How to Play" section at the top of a setup screen, as the web's
 * `PracticeHowToPlaySection` lays it out: the heading, a centred muted
 * description, and the module's demo under it. The section is unframed on
 * purpose — the web dropped its card because the frame drew the eye to
 * itself and boxed in demos that are already visually distinct.
 */
export function HowToPlaySection({
  title,
  description,
  children,
}: HowToPlaySectionProps) {
  const { colors } = useTheme();
  return (
    <View>
      <SectionTitle>{title}</SectionTitle>
      <View style={styles.body}>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>
          {description}
        </Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  description: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: spacing.md,
  },
});
