import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  EARNED_RANK_SLUGS,
  achievedRankCount,
  rankStanding,
  type RankSlug,
} from "@blindfold-chess/features/dojo-ranks";

import {
  borderRadius,
  fontSize,
  fontWeight,
  spacing,
  useTheme,
} from "../../theme";
import { beltColors } from "./belt";

/**
 * The current rank over the ladder from 5kyu to 1dan: one segment per rank,
 * filled in its belt colour once earned, a faint wash of it for the next
 * goal, grey beyond. Read out as one progress bar.
 */
export function RankLadder({
  highest,
}: {
  readonly highest: RankSlug | undefined;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const done = achievedRankCount(highest);
  const total = EARNED_RANK_SLUGS.length;
  const currentName = t(`ranks.names.${highest ?? "mukyu"}`);

  return (
    <View style={styles.root}>
      <View style={styles.labels}>
        <View style={styles.current}>
          <Text
            style={[styles.currentLabel, { color: colors.mutedForeground }]}
          >
            {t("dojo.currentRank")}
          </Text>
          <Text style={[styles.currentName, { color: colors.foreground }]}>
            {currentName}
          </Text>
        </View>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {t("dojo.rankProgress", { done, total })}
        </Text>
      </View>
      <View
        style={styles.segments}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t("dojo.currentRank")}
        accessibilityValue={{
          min: 0,
          max: total,
          now: done,
          text: t("dojo.rankProgressValue", { rank: currentName, done, total }),
        }}
      >
        {EARNED_RANK_SLUGS.map((slug) => {
          const standing = rankStanding(slug, highest);
          const belt = beltColors(slug, colors);
          const isCurrent = slug === highest;
          return (
            <View key={slug} style={styles.segment}>
              <View
                style={[
                  styles.track,
                  {
                    backgroundColor:
                      standing === "achieved"
                        ? belt.fill
                        : standing === "next"
                          ? belt.tint
                          : colors.muted,
                  },
                ]}
              />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[
                  styles.segmentName,
                  { color: colors.mutedForeground },
                  isCurrent && {
                    color: colors.foreground,
                    fontWeight: fontWeight.bold,
                  },
                ]}
              >
                {t(`ranks.names.${slug}`)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  labels: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  current: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
    flexShrink: 1,
  },
  currentLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  currentName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  count: {
    fontSize: fontSize.xs,
    fontVariant: ["tabular-nums"],
  },
  segments: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: spacing.xs,
  },
  track: {
    alignSelf: "stretch",
    height: 8,
    borderRadius: borderRadius.full,
  },
  segmentName: {
    fontSize: fontSize.xs,
  },
});
