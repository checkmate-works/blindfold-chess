import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Card } from "../../components";
import {
  borderRadius,
  fontSize,
  fontWeight,
  spacing,
  useTheme,
  withAlpha,
} from "../../theme";
import type { ChallengeResultSummary } from "./challenge-api";

type Exp = NonNullable<ChallengeResultSummary["exp"]>;

/**
 * The web result's EXP card: the EXP this run earned, the level and how far
 * into it the player is, and "Level Up!" when the run crossed a level. The
 * numbers are the server's (`getExpInfoBySource`), as on the web.
 *
 * Ink rather than the web's blue for the figures and the bar: blue is kept
 * for what can be pressed.
 */
export function ExpGainCard({ exp }: { exp: Exp }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const percent = Math.min(Math.max(exp.progressPercent, 0), 100);

  return (
    <Card padding="md" style={styles.card}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          EXP
        </Text>
        <Text style={[styles.earned, { color: colors.foreground }]}>
          +{exp.earnedExp} EXP
        </Text>
      </View>
      <View style={styles.levelBlock}>
        <View style={styles.row}>
          <Text style={[styles.level, { color: colors.foreground }]}>
            Lv.{exp.level}
          </Text>
          <Text style={[styles.percent, { color: colors.mutedForeground }]}>
            {percent}%
          </Text>
        </View>
        <View
          style={[styles.track, { backgroundColor: colors.secondary }]}
          accessibilityRole="progressbar"
          accessibilityLabel={`Lv.${exp.level}`}
          accessibilityValue={{ min: 0, max: 100, now: percent }}
        >
          <View
            style={[
              styles.fill,
              { backgroundColor: colors.foreground, width: `${percent}%` },
            ]}
          />
        </View>
      </View>
      {exp.levelUp && (
        <View
          style={[
            styles.levelUp,
            { backgroundColor: withAlpha(colors.success, 0.12) },
          ]}
        >
          <Text style={[styles.levelUpText, { color: colors.success }]}>
            {t("practiceResult.levelUp")}
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  earned: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  levelBlock: {
    gap: 6,
  },
  level: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  percent: {
    fontSize: fontSize.xs,
    fontVariant: ["tabular-nums"],
  },
  track: {
    height: 8,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: borderRadius.full,
  },
  levelUp: {
    alignSelf: "center",
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: spacing.xs,
  },
  levelUpText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
