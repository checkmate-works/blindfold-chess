import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useDemoAnswerLoop } from "../../../lib/use-demo-answer-loop";
import { fontSize, fontWeight, useTheme } from "../../../theme";
import type { SymmetryType } from "../lib/types";

/** e4 mirrored across the line between the d and e files is d4. */
const DEMO: { square: string; type: SymmetryType; answer: string } = {
  square: "e4",
  type: "horizontal",
  answer: "d4",
};

/**
 * The setup screen's demo: the web's `e4 → ?` line. Like every module's demo
 * it also plays the answer on a loop, so it says which symmetry is asked
 * over the line ("File symmetry of e4?") — without it "d4" would read as
 * any square — and the "?" turns into a green d4, the way a correct answer
 * looks in a run.
 */
export function HowToPlayDemo() {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();
  const answered = useDemoAnswerLoop();

  return (
    <View style={styles.container}>
      <Text style={[styles.question, { color: colors.mutedForeground }]}>
        {t("boardSymmetry.session.question", {
          // boardSymmetry.session.types.horizontal
          type: t(`boardSymmetry.session.types.${DEMO.type}`),
          square: DEMO.square,
        })}
      </Text>
      <View style={styles.row}>
        <Text style={[styles.square, { color: colors.foreground }]}>
          {DEMO.square}
        </Text>
        <Text style={[styles.square, { color: colors.mutedForeground }]}>
          {"→"}
        </Text>
        <Text
          style={[
            styles.square,
            styles.answer,
            {
              color: answered ? feedbackColors.success : colors.foreground,
            },
          ]}
        >
          {answered ? DEMO.answer : "?"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 8,
  },
  question: {
    fontSize: fontSize.sm,
  },
  // The web's `gap-3` row of `text-lg font-bold`.
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  square: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  // Keeps "?" and "d4" the same width, so the row does not shift.
  answer: {
    minWidth: 24,
    textAlign: "center",
  },
});
