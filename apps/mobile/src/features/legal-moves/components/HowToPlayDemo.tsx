import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useDemoAnswerLoop } from "../../../lib/use-demo-answer-loop";
import { fontWeight, useTheme } from "../../../theme";
import { pieceDisplayMap } from "../lib/types";
import { LegalIllegalButtons } from "./LegalIllegalButtons";

/** A knight cannot go from e2 to e4: the demo's answer is "cannot". */
const DEMO = { from: "e2", to: "e4", piece: "n", isLegal: false } as const;

/**
 * The setup screen's demo, as the web's: "Can the piece move from e2 to
 * e4?" over a knight and the small ○ / × pair. Like every module's demo it
 * also plays the answer on a loop: "cannot" takes the session's green ring
 * and the question turns green, the way a correct answer looks in a run.
 */
export function HowToPlayDemo() {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();
  const answered = useDemoAnswerLoop();

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.sentence,
          { color: answered ? feedbackColors.success : colors.foreground },
        ]}
      >
        {t("legalMoves.session.question", { from: DEMO.from, to: DEMO.to })}
      </Text>
      <Text style={[styles.piece, { color: colors.foreground }]}>
        {pieceDisplayMap[DEMO.piece]}
      </Text>
      <LegalIllegalButtons
        compact
        selected={answered ? { isLegal: DEMO.isLegal, correct: true } : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    alignSelf: "stretch",
  },
  // The web's `text-lg font-bold mb-3`.
  sentence: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    marginBottom: 12,
    textAlign: "center",
  },
  // The web's `text-5xl mb-4`.
  piece: {
    fontSize: 48,
    lineHeight: 52,
    marginBottom: 16,
  },
});
