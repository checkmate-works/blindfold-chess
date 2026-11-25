import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  fontSize,
  fontWeight,
  spacing,
  useFeedbackColor,
  useTheme,
} from "../../../theme";
import type { BoardSymmetryProblem } from "../lib/types";

/** The web's `text-6xl`: 60px, line height 1. */
const SQUARE_SIZE = 60;

type SymmetryQuestionProps = {
  /** Null while the first question is on its way: the rows keep their height. */
  problem: BoardSymmetryProblem | null;
  selectedFile: string | null;
  selectedRank: string | null;
  /** The verdict on the last answer while it is shown, else null. */
  isCorrect: boolean | null;
  /** The right square, shown under a wrong answer. */
  correctSolution: string | null;
  /**
   * Seconds left before the challenge starts: the count stands in the
   * `square → answer` row and the question line stays empty, so nothing
   * around it moves when the first question appears.
   */
  countdown?: number | null;
};

/**
 * The question as the web's `BoardSymmetryQuestionPanel` shows it: the
 * sentence ("File symmetry of e4?"), then `e4 → ?` at display size, the
 * answer turning green or red with the verdict.
 *
 * Unlike the web, a wrong answer also names the right square on a small
 * line under the row, for the two seconds the verdict stays up; the line's
 * height is always kept, so the pad below never moves.
 */
export function SymmetryQuestion({
  problem,
  selectedFile,
  selectedRank,
  isCorrect,
  correctSolution,
  countdown = null,
}: SymmetryQuestionProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const verdictColor = useFeedbackColor(isCorrect);
  const shown = countdown === null ? problem : null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sentence, { color: colors.foreground }]}>
        {shown
          ? t("boardSymmetry.session.question", {
              // boardSymmetry.session.types.<SymmetryType>: boardSymmetry.session.types.horizontal, boardSymmetry.session.types.vertical, boardSymmetry.session.types.point (SYMMETRY_TYPES)
              type: t(`boardSymmetry.session.types.${shown.type}`),
              square: shown.square,
            })
          : " "}
      </Text>

      <View style={styles.squareRow}>
        {countdown !== null ? (
          <Text style={[styles.square, { color: colors.primary }]}>
            {countdown > 0 ? String(countdown) : "START!"}
          </Text>
        ) : shown ? (
          <>
            <Text style={[styles.square, { color: colors.foreground }]}>
              {shown.square}
            </Text>
            <Text style={[styles.square, { color: colors.mutedForeground }]}>
              {"→"}
            </Text>
            <Text
              style={[
                styles.square,
                styles.answer,
                {
                  color:
                    isCorrect === null ? colors.mutedForeground : verdictColor,
                },
              ]}
            >
              {selectedFile && selectedRank
                ? `${selectedFile}${selectedRank}`
                : "?"}
            </Text>
          </>
        ) : null}
      </View>

      <Text style={[styles.solution, { color: verdictColor }]}>
        {isCorrect === false && correctSolution
          ? t("boardSymmetry.session.incorrectWithSolution", {
              solution: correctSolution,
            })
          : " "}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  // The web's `SectionTitle` (text-base font-medium) and its mb-4.
  sentence: {
    fontSize: fontSize.md,
    lineHeight: 24,
    fontWeight: fontWeight.medium,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  // The web's `gap-4` row, set solid as its `text-6xl` is.
  squareRow: {
    height: SQUARE_SIZE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  square: {
    fontSize: SQUARE_SIZE,
    lineHeight: SQUARE_SIZE * 1.15,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  // The web's `min-w-[2ch]`, so "?" and "d4" take the same room.
  answer: {
    minWidth: SQUARE_SIZE * 1.2,
    textAlign: "center",
  },
  // Sits in the web's 40 between the row and the pad (mb-4 + mb-6): 4 above,
  // 20 for the line, 16 below.
  solution: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    height: 20,
    fontSize: fontSize.sm,
    lineHeight: 20,
    fontWeight: fontWeight.medium,
  },
});
