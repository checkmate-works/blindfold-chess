import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type {
  RankSlug,
  RankStanding,
} from "@blindfold-chess/features/dojo-ranks";

import {
  borderRadius,
  fontSize,
  fontWeight,
  spacing,
  useTheme,
} from "../../theme";
import { BeltBadge } from "./BeltBadge";
import { beltColors } from "./belt";

/**
 * One rank as a card: a band in its belt colour along the top, the badge,
 * the rank's name with its standing, and what the rank certifies. The dojo
 * puts the next goal in one, the home tab puts it there with its buttons
 * (`children`), and the rank screen opens with one.
 *
 * The frame is a 1px `colors.panelBorder`, like the app's other panels; the
 * 4pt top edge stays in the belt colour so the rank is readable at a glance.
 */
export function RankGoalCard({
  slug,
  standing,
  eyebrow,
  children,
}: {
  readonly slug: RankSlug;
  /**
   * The standing pill. Left out where the caption already says it (a card
   * captioned "Next goal" needs no "Next" pill).
   */
  readonly standing?: RankStanding;
  /** A caption above the rank's name ("Next goal"). */
  readonly eyebrow?: string;
  readonly children?: ReactNode;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const belt = beltColors(slug, colors);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.panelBorder,
          borderTopColor: slug === "mukyu" ? colors.panelBorder : belt.fill,
        },
      ]}
    >
      <View style={styles.heading}>
        <BeltBadge slug={slug} size={40} />
        <View style={styles.titles}>
          {eyebrow ? (
            <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>
              {eyebrow}
            </Text>
          ) : null}
          <Text
            accessibilityRole="header"
            style={[styles.name, { color: colors.foreground }]}
          >
            {t(`ranks.names.${slug}`)}
          </Text>
        </View>
        {standing ? <StandingPill standing={standing} /> : null}
      </View>
      <Text style={[styles.criteria, { color: colors.foreground }]}>
        {t(`ranks.criteria.${slug}`)}
      </Text>
      {children}
    </View>
  );
}

/** Earned / next / not yet, as a small pill. */
export function StandingPill({
  standing,
}: {
  readonly standing: RankStanding;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const palette = {
    achieved: { bg: colors.successSoft, fg: colors.successSoftForeground },
    next: { bg: colors.infoSoft, fg: colors.infoSoftForeground },
    locked: { bg: colors.muted, fg: colors.mutedForeground },
  }[standing];
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      {/* dojo.status.achieved, dojo.status.next, dojo.status.locked */}
      <Text style={[styles.pillText, { color: palette.fg }]}>
        {t(`dojo.status.${standing}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderTopWidth: 4,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  titles: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eyebrow: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  criteria: {
    fontSize: fontSize.sm,
    lineHeight: 21,
  },
  pill: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  pillText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
});
