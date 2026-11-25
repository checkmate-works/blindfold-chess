import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  fontWeight,
  spacing,
  useFeedbackColor,
  useTheme,
} from "../../../theme";
import type { MoveQuestion } from "../lib/types";
import { pieceDisplayMap } from "../lib/types";
import { LegalIllegalButtons } from "./LegalIllegalButtons";

/** The web's `text-7xl`: 72px, line height 1. */
const PIECE_SIZE = 72;

type QuestionPanelProps = {
  question: MoveQuestion | null;
  /** The verdict on the last answer while it is shown, else null. */
  verdict: boolean | null;
  /** The button pressed for the answer being shown. */
  answeredLegal: boolean | null;
  onAnswer: (isLegal: boolean) => void;
  disabled: boolean;
  /** The challenge's countdown, shown where the question will appear. */
  countdown?: number | null;
};

/**
 * The question and its answer pair, laid out as the web's
 * `LegalMovesQuestionPanel`: "Can the piece move from e2 to e4?" in bold,
 * turning green or red with the verdict, over the piece at display size, in
 * a block at least 160 tall; 32 below it the two buttons. Challenge and
 * training both stack it from the top, as the web does.
 */
export function QuestionPanel({
  question,
  verdict,
  answeredLegal,
  onAnswer,
  disabled,
  countdown = null,
}: QuestionPanelProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const verdictColor = useFeedbackColor(verdict);

  return (
    <View style={styles.panel}>
      <View style={styles.question}>
        {countdown !== null ? (
          <Text style={[styles.countdown, { color: colors.primary }]}>
            {countdown > 0 ? String(countdown) : "START!"}
          </Text>
        ) : question ? (
          <>
            <Text
              style={[
                styles.sentence,
                {
                  color: verdict === null ? colors.foreground : verdictColor,
                },
              ]}
            >
              {t("legalMoves.session.question", {
                from: question.from,
                to: question.to,
              })}
            </Text>
            <Text style={[styles.piece, { color: colors.foreground }]}>
              {pieceDisplayMap[question.piece]}
            </Text>
          </>
        ) : null}
      </View>
      <LegalIllegalButtons
        onAnswer={onAnswer}
        disabled={disabled}
        selected={
          verdict !== null && answeredLegal !== null
            ? { isLegal: answeredLegal, correct: verdict }
            : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: spacing.lg,
  },
  // The web's `mb-8 min-h-[160px]`, centred.
  question: {
    minHeight: 160,
    marginBottom: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  // The web's `text-lg font-bold mb-6`.
  sentence: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  piece: {
    fontSize: PIECE_SIZE,
    lineHeight: PIECE_SIZE * 1.1,
  },
  countdown: {
    fontSize: PIECE_SIZE,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
});
