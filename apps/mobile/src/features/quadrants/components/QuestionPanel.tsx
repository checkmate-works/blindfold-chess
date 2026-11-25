import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type {
  QuadrantId,
  QuadrantQuestion,
} from "@blindfold-chess/features/quadrants";

import { TurnIndicator } from "../../../components";
import { fontSize, fontWeight, spacing, useTheme } from "../../../theme";
import { QuadrantBoard } from "./QuadrantBoard";

type QuestionPanelProps = {
  question: QuadrantQuestion;
  /** The quadrant that held the square, while feedback shows. */
  correctQuadrant: QuadrantId | null;
  /** The quadrant the player wrongly picked, while feedback shows. */
  wrongQuadrant: QuadrantId | null;
  onAnswer: (quadrant: QuadrantId) => void;
  disabled: boolean;
  /**
   * The challenge's countdown. While set, the side and the square are
   * hidden (their rows keep their height) and the count stands over the
   * board; training leaves it out.
   */
  countdown?: number | null;
};

/**
 * The web's quadrants play area, top to bottom with its `space-y-4`: which
 * side the board is seen from, the question (`text-2xl font-bold`), and the
 * board. The verdict shows on the board alone, as on the web — the right
 * quarter green, a wrong pick red — so there is no "Correct!" line.
 */
export function QuestionPanel({
  question,
  correctQuadrant,
  wrongQuadrant,
  onAnswer,
  disabled,
  countdown = null,
}: QuestionPanelProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const countingDown = countdown !== null;
  const white = question.orientation === "white";

  return (
    <View style={styles.panel}>
      <TurnIndicator
        side={question.orientation}
        label={
          white
            ? t("quadrants.session.whiteToMove")
            : t("quadrants.session.blackToMove")
        }
        hidden={countingDown}
        variant="web"
      />

      <Text
        style={[
          styles.question,
          { color: colors.foreground },
          countingDown && styles.hidden,
        ]}
      >
        {t("quadrants.session.question", { square: question.square })}
      </Text>

      <View>
        <QuadrantBoard
          orientation={question.orientation}
          correctQuadrant={correctQuadrant}
          wrongQuadrant={wrongQuadrant}
          onQuadrantPress={onAnswer}
          disabled={disabled || countingDown}
        />
        {countingDown && (
          <View
            style={styles.countdownVeil}
            testID="countdown-overlay"
            accessibilityLiveRegion="polite"
          >
            <Text style={styles.countdownText}>
              {countdown > 0 ? countdown : "START!"}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: "center",
    gap: spacing.md,
  },
  question: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  hidden: {
    opacity: 0,
  },
  /**
   * The coordinate quiz's countdown over its board: the web veils the
   * content with a blur, which React Native has no way to draw, so a dark
   * wash hides the board instead.
   */
  countdownVeil: {
    ...StyleSheet.absoluteFill,
    borderRadius: 6,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  countdownText: {
    color: "#ffffff",
    fontSize: 96,
    fontWeight: "900",
  },
});
