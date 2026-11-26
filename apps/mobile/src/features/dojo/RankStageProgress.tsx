import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  currentStage,
  type RankJourney,
} from "@blindfold-chess/features/dojo-journey";

import {
  borderRadius,
  fontSize,
  fontWeight,
  spacing,
  useTheme,
} from "../../theme";
import { beltColors } from "./belt";

type StageCount = RankJourney["stages"][number];

/**
 * A stage's value: "n / N", except an exam of one requirement, which is
 * passed or not and reads as such.
 */
function stageValue({ stage, done, total }: StageCount, t: TFunction): string {
  if (stage === "exam" && total === 1) {
    return t(done === 1 ? "dojo.stageExamPassed" : "dojo.stageExamNotPassed");
  }
  return t("dojo.rankProgress", { done, total });
}

/**
 * How far the player is through one rank, as one cell per stage side by
 * side: learn (the rank's guide pages), practice (each challenge tried at
 * least once), exam.
 *
 * @description
 * The exam stage is the rank's requirements themselves: in chess, reaching
 * a challenge's bar or passing an exam problem is what grants the rank, so
 * there is no separate test after them. An exam of one requirement shows
 * passed / not yet; one of several shows "n / N". A rank already held has
 * every stage done, whatever was recorded on the way. A stage the rank has
 * nothing for (1dan has no guide and no challenge) has no cell.
 *
 * A finished stage shows its value in the success colour with a check. On
 * the rank being worked towards (standing "next"), the stage the next step
 * belongs to is washed in the belt's tint, in the belt's colours rather
 * than the app's green for the same reason as `BeltButton`. Each cell is
 * read out as the stage's name followed by its value ("Learn 2 / 5").
 */
export function RankStageProgress({
  journey,
}: {
  readonly journey: RankJourney;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const belt = beltColors(journey.rank, colors);
  const current =
    journey.standing === "next" ? currentStage(journey) : undefined;

  return (
    <View
      style={[styles.row, { borderColor: colors.border }]}
      testID={`stage-progress-${journey.rank}`}
    >
      {journey.stages.map((count, index) => {
        const isCurrent = count.stage === current;
        const finished = count.done >= count.total;
        // dojo.stages.learn, dojo.stages.practice, dojo.stages.exam
        const name = t(`dojo.stages.${count.stage}`);
        const value = stageValue(count, t);
        return (
          <View
            key={count.stage}
            accessible
            accessibilityLabel={`${name} ${value}`}
            testID={`stage-${count.stage}`}
            style={[
              styles.cell,
              index > 0 && {
                borderLeftWidth: StyleSheet.hairlineWidth,
                borderLeftColor: colors.border,
              },
              isCurrent && { backgroundColor: belt.tint },
            ]}
          >
            <Text
              style={[
                styles.name,
                { color: isCurrent ? belt.tintText : colors.mutedForeground },
              ]}
            >
              {name}
            </Text>
            <View style={styles.valueRow}>
              {finished ? (
                <Ionicons name="checkmark" size={14} color={colors.success} />
              ) : null}
              <Text
                style={[
                  styles.value,
                  {
                    color: finished
                      ? colors.success
                      : isCurrent
                        ? belt.tintText
                        : colors.foreground,
                  },
                ]}
              >
                {value}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
  cell: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  name: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  value: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
});
