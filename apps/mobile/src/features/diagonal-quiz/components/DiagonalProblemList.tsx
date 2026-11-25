import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  X,
} from "lucide-react-native";
import type { DiagonalQuestionResult } from "@blindfold-chess/features/diagonal-quiz";

import { fontSize, fontWeight, spacing, useTheme } from "../../../theme";
import { DiagonalAnswerComparison } from "./DiagonalAnswerComparison";
import { DiagonalBoard } from "./DiagonalBoard";

/**
 * The web's `DiagonalQuizProblemList` under the challenge result: a
 * "Problem Details" heading over one row per question, "No.N", the square
 * and the verdict, each opening onto the board with both lines tinted and
 * the answers side by side. The missed questions start open, as the web
 * opens them on arrival. The question the time ran out on is marked with a
 * clock and "Time's up" in a neutral colour, not as one more wrong answer
 * than the score counts.
 */
export function DiagonalProblemList({
  results,
}: {
  results: readonly DiagonalQuestionResult[];
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(
    () =>
      new Set(
        results.flatMap((result, index) => (result.isCorrect ? [] : [index])),
      ),
  );

  if (results.length === 0) return null;

  const toggle = (index: number) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <View>
      <Text style={[styles.heading, { color: colors.mutedForeground }]}>
        {t("diagonalQuiz.result.problemDetails")}
      </Text>
      <View style={styles.list}>
        {results.map((result, index) => (
          <ProblemRow
            key={index}
            number={index + 1}
            result={result}
            expanded={expanded.has(index)}
            onToggle={() => toggle(index)}
          />
        ))}
      </View>
    </View>
  );
}

function ProblemRow({
  number,
  result,
  expanded,
  onToggle,
}: {
  number: number;
  result: DiagonalQuestionResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();
  const Chevron = expanded ? ChevronDown : ChevronRight;
  const verdictColor = result.timedOut
    ? colors.mutedForeground
    : result.isCorrect
      ? feedbackColors.success
      : feedbackColors.error;
  const VerdictIcon = result.timedOut ? Clock : result.isCorrect ? Check : X;
  const verdict = result.timedOut
    ? t("diagonalQuiz.result.timeUp")
    : result.isCorrect
      ? t("diagonalQuiz.session.correct")
      : t("diagonalQuiz.session.incorrect");

  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.summary,
          pressed && { backgroundColor: `${colors.muted}80` },
        ]}
      >
        <View style={styles.summaryStart}>
          <Chevron size={12} color={colors.mutedForeground} strokeWidth={3} />
          <Text style={[styles.number, { color: colors.foreground }]}>
            No.{number}
          </Text>
          <Text style={[styles.square, { color: colors.mutedForeground }]}>
            {result.square}
          </Text>
        </View>
        <View style={styles.verdict}>
          <VerdictIcon size={12} color={verdictColor} strokeWidth={3} />
          <Text style={[styles.verdictText, { color: verdictColor }]}>
            {verdict}
          </Text>
        </View>
      </Pressable>

      {expanded && (
        <View
          style={[
            styles.details,
            {
              borderTopColor: colors.border,
              backgroundColor: `${colors.muted}4d`,
            },
          ]}
        >
          <DiagonalBoard square={result.square} />
          <View style={styles.comparison}>
            <DiagonalAnswerComparison
              correctDiagonal={result.correctDiagonal}
              correctAntiDiagonal={result.correctAntiDiagonal}
              userDiagonal={result.userDiagonal}
              userAntiDiagonal={result.userAntiDiagonal}
              isDiagonalCorrect={result.isDiagonalCorrect}
              isAntiDiagonalCorrect={result.isAntiDiagonalCorrect}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // The web's `text-sm font-medium text-muted-foreground mb-2`.
  heading: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  // The web's `space-y-2`.
  list: {
    gap: spacing.sm,
  },
  // The web's `border rounded-lg overflow-hidden`.
  row: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  // The web's `p-3` button.
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  summaryStart: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 1,
  },
  number: {
    fontSize: fontSize.md,
    lineHeight: 24,
    fontWeight: fontWeight.medium,
  },
  square: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  verdict: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  verdictText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    fontWeight: fontWeight.medium,
  },
  // The web's `px-3 pb-3 pt-4 border-t bg-muted/30`.
  details: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  // The web's `mt-4`.
  comparison: {
    marginTop: spacing.md,
  },
});
