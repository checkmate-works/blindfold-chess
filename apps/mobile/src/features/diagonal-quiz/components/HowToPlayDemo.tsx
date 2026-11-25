import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { getDiagonals } from "@blindfold-chess/features/diagonal-quiz";

import { useDemoAnswerLoop } from "../../../lib/use-demo-answer-loop";
import { fontSize, fontWeight, useTheme } from "../../../theme";

const DEMO_SQUARE = "e4";
const DEMO_ANSWER = getDiagonals(DEMO_SQUARE);
const BLANK = "??-??";

/**
 * The setup screen's demo, as the web's: "e4" over the two answer lines,
 * "Diagonal (a1-h8 direction): ??-??" and the anti-diagonal's. Like every
 * module's demo it also plays the answer on a loop: both lines fill in
 * (b1-h7, a8-h1) in green, the way a correct answer looks in a run.
 */
export function HowToPlayDemo() {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();
  const answered = useDemoAnswerLoop();

  const line = (label: string, answer: string) => (
    <Text style={[styles.line, { color: colors.mutedForeground }]}>
      {label}:{" "}
      <Text
        style={[styles.answer, answered && { color: feedbackColors.success }]}
      >
        {answered ? answer : BLANK}
      </Text>
    </Text>
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.square, { color: colors.foreground }]}>
        {DEMO_SQUARE}
      </Text>
      <View style={styles.lines}>
        {line(t("diagonalQuiz.session.diagonalLabel"), DEMO_ANSWER.diagonal)}
        {line(
          t("diagonalQuiz.session.antiDiagonalLabel"),
          DEMO_ANSWER.antiDiagonal,
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  // The web's `text-5xl font-bold mb-4`.
  square: {
    fontSize: 48,
    lineHeight: 52,
    fontWeight: fontWeight.bold,
    marginBottom: 16,
  },
  // The web's `space-y-1 text-sm`.
  lines: {
    alignItems: "center",
    gap: 4,
  },
  line: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  answer: {
    fontVariant: ["tabular-nums"],
    fontWeight: fontWeight.medium,
  },
});
