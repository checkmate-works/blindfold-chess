import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { feedbackColors, fontSize, fontWeight, useTheme } from "../../../theme";
import { MONO_FONT } from "../lib/fonts";

type MovesStripProps = {
  start: string;
  end: string;
  /** The squares entered so far, after `start`. */
  moves: readonly string[];
  /**
   * The verdict on the submitted route while it is shown, else null. The
   * strip then turns green or red, and `moves` ends with the goal square the
   * submission appended, drawn as plain text like `start` rather than as a
   * chip.
   */
  verdict: boolean | null;
  /** Drops the last square; the round button shows only while there is one. */
  onUndo?: () => void;
};

/**
 * The route being entered, as the web's `MovesHistory`: the start square,
 * an arrow and a chip per square entered, the round undo button, then an
 * arrow to the goal in muted text. After a submission the goal hint goes
 * and the strip takes the verdict's colour.
 */
export function MovesStrip({
  start,
  end,
  moves,
  verdict,
  onUndo,
}: MovesStripProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const answered = verdict !== null;

  const frame = answered
    ? verdict
      ? {
          borderColor: colors.success,
          backgroundColor: feedbackColors.successSoft,
        }
      : {
          borderColor: colors.destructive,
          backgroundColor: feedbackColors.errorSoft,
        }
    : { borderColor: "transparent", backgroundColor: colors.muted };

  return (
    <View style={[styles.strip, frame]}>
      <Text style={[styles.endpoint, { color: colors.mutedForeground }]}>
        {start}
      </Text>
      {moves.map((move, i) => {
        const isGoal = answered && i === moves.length - 1 && move === end;
        return (
          <View key={i} style={styles.step}>
            <Text style={[styles.arrow, { color: colors.mutedForeground }]}>
              {"→"}
            </Text>
            {isGoal ? (
              <Text
                style={[styles.endpoint, { color: colors.mutedForeground }]}
              >
                {move}
              </Text>
            ) : (
              <View
                style={[
                  styles.chip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.chipText, { color: colors.foreground }]}>
                  {move}
                </Text>
              </View>
            )}
          </View>
        );
      })}

      {!answered && moves.length > 0 && onUndo && (
        <Pressable
          onPress={onUndo}
          accessibilityRole="button"
          accessibilityLabel={t("routePlanner.session.undo")}
          testID="route-undo"
          hitSlop={6}
          style={({ pressed }) => [
            styles.undo,
            {
              backgroundColor: pressed ? colors.muted : colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="arrow-undo"
            size={14}
            color={colors.mutedForeground}
          />
        </Pressable>
      )}

      {!answered && (
        <View style={[styles.step, styles.goalHint]}>
          <Text style={[styles.arrow, { color: colors.mutedForeground }]}>
            {"→"}
          </Text>
          <Text style={[styles.endpoint, { color: colors.mutedForeground }]}>
            {end}
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * The web's `flex flex-wrap gap-2 items-center min-h-[3rem] p-4 rounded-md
 * border`, with `font-mono font-bold` squares, `mx-1` arrows and
 * `px-2 py-1 rounded border` chips; the undo button is its `w-8 h-8
 * rounded-full ml-2`.
 */
const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    minHeight: 48,
    padding: 16,
    borderRadius: 6,
    borderWidth: 1,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
  },
  goalHint: {
    marginLeft: 8,
  },
  endpoint: {
    fontFamily: MONO_FONT,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  arrow: {
    fontSize: fontSize.md,
    marginHorizontal: 4,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: MONO_FONT,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  undo: {
    width: 32,
    height: 32,
    marginLeft: 8,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
