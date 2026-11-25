import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import type { RoutePlannerProblemResult } from "@blindfold-chess/features/route-planner";

import { ListSection } from "../../../components";
import {
  fontSize,
  fontWeight,
  spacing,
  useTheme,
  monoFont,
  withAlpha,
} from "../../../theme";
import { ProblemFeedback } from "./ProblemFeedback";

/**
 * The panel's own border and the open row's padding, taken off the board's
 * width on top of the screen's padding.
 */
const ROW_INSET = 2 + 16 * 2;

/**
 * The web result's "Problem Details": a row per problem (#, piece, start →
 * target, OK / NG / Skipped, or "Time's up" for the one the clock cut off)
 * that opens onto the same feedback as training's. Each row opens on its
 * own; the missed ones start open, as the web reveals them.
 */
export function ProblemList({
  problems,
}: {
  problems: readonly RoutePlannerProblemResult[];
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(
    () =>
      new Set(problems.flatMap((problem, i) => (problem.success ? [] : [i]))),
  );
  if (problems.length === 0) return null;

  const toggle = (index: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(index)) next.add(index);
      return next;
    });

  return (
    <ListSection title={t("routePlanner.result.problemDetails")}>
      {problems.map((problem, index) => (
        <ProblemRow
          key={index}
          index={index}
          problem={problem}
          expanded={open.has(index)}
          onToggle={toggle}
        />
      ))}
    </ListSection>
  );
}

function ProblemRow({
  index,
  problem,
  expanded,
  onToggle,
}: {
  index: number;
  problem: RoutePlannerProblemResult;
  expanded: boolean;
  onToggle: (index: number) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View>
      <Pressable
        onPress={() => onToggle(index)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: withAlpha(colors.muted, 0.5) },
        ]}
        testID={`route-result-row-${index}`}
      >
        <View style={styles.lead}>
          <Ionicons
            name={expanded ? "chevron-down" : "chevron-forward"}
            size={12}
            color={colors.mutedForeground}
          />
          <Text style={[styles.number, { color: colors.mutedForeground }]}>
            #{index + 1}
          </Text>
          <ChessPieceIcon type={problem.piece} color="w" size={20} />
          <View style={styles.squares}>
            <Text style={[styles.square, { color: colors.foreground }]}>
              {problem.start}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={10}
              color={colors.mutedForeground}
            />
            <Text style={[styles.square, { color: colors.foreground }]}>
              {problem.end}
            </Text>
          </View>
        </View>
        {problem.timedOut ? (
          // Not a verdict, so neutral: an NG would read as one more wrong
          // answer than the score counts.
          <View style={styles.timeUp}>
            <Ionicons
              name="time-outline"
              size={12}
              color={colors.mutedForeground}
            />
            <Text style={[styles.status, { color: colors.mutedForeground }]}>
              {t("routePlanner.result.timeUp")}
            </Text>
          </View>
        ) : (
          <Text
            style={[
              styles.status,
              {
                color: problem.success
                  ? colors.success
                  : problem.skipped
                    ? colors.mutedForeground
                    : colors.destructive,
              },
            ]}
          >
            {problem.success
              ? "OK"
              : problem.skipped
                ? t("routePlanner.result.skipped")
                : "NG"}
          </Text>
        )}
      </Pressable>
      {expanded && (
        <View
          style={[
            styles.detail,
            {
              backgroundColor: withAlpha(colors.muted, 0.3),
              borderTopColor: colors.border,
            },
          ]}
        >
          <ProblemFeedback
            piece={problem.piece}
            start={problem.start}
            end={problem.end}
            moves={problem.userPath}
            shortestPath={problem.shortestPath}
            success={problem.success}
            // A timed-out problem has no route of the player's either.
            skipped={problem.skipped || problem.timedOut}
            boardInset={spacing.lg * 2 + ROW_INSET}
          />
        </View>
      )}
    </View>
  );
}

/**
 * The web's `p-3` row with `gap-4`, the `w-8` number, `text-sm font-bold`
 * verdict, and the open row's `p-4 bg-muted/30 border-t`.
 */
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  lead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  number: {
    width: 32,
    fontFamily: monoFont,
    fontSize: fontSize.sm,
  },
  squares: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  square: {
    fontFamily: monoFont,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  timeUp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  status: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  detail: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
