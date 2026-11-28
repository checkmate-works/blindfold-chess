import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  feedbackColors,
} from "../../../theme";
import type { GameTermination } from "../hooks/useGameSession";
import type { PlayerResult } from "../lib/types";
import { TerminationMarkBadge } from "./TerminationMarkBadge";

type ResultHeadlineProps = {
  result: PlayerResult;
  termination: GameTermination;
  /** `lg` heads the finish sheet; `md` sits over the frozen controls. */
  size?: "md" | "lg";
};

const RESULT_COLOR: Record<PlayerResult, string> = {
  win: feedbackColors.success,
  loss: feedbackColors.error,
  draw: feedbackColors.warning,
};

/**
 * How a finished AI game went, in one line and the reason under it: "You
 * win! / Checkmate", "Draw / Stalemate".
 *
 * A resignation leads with the act — "You resigned", under the same flag
 * the board puts on the king — and names the loss only below it, in ink
 * rather than red. The player chose to end the game; a big red "You Lose"
 * read as though the board had beaten them.
 */
export function ResultHeadline({
  result,
  termination,
  size = "lg",
}: ResultHeadlineProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const resigned = termination === "resignation";
  // aiGame.result.<PlayerResult>: aiGame.result.win, aiGame.result.loss, aiGame.result.draw
  const resultLabel = t(`aiGame.result.${result}`);
  const title = resigned ? t("aiGame.session.resigned") : resultLabel;
  const subtitle = resigned
    ? resultLabel
    : termination === "draw"
      ? null
      : // aiGame.result.termination.<checkmate|stalemate>: aiGame.result.termination.checkmate, aiGame.result.termination.stalemate
        t(`aiGame.result.termination.${termination}`);
  const markKind =
    termination === "checkmate" || termination === "resignation"
      ? termination
      : null;
  const titleSize = size === "lg" ? fontSize.xxxl : fontSize.xxl;

  return (
    <View
      accessible
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={styles.container}
    >
      <View style={styles.titleRow}>
        {markKind ? (
          <TerminationMarkBadge
            kind={markKind}
            size={Math.round(titleSize * 0.9)}
          />
        ) : null}
        <Text
          style={[
            styles.title,
            {
              fontSize: titleSize,
              color: resigned ? colors.foreground : RESULT_COLOR[result],
            },
          ]}
        >
          {title}
        </Text>
      </View>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    fontWeight: fontWeight.bold,
    textAlign: "center",
    flexShrink: 1,
  },
  subtitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    textAlign: "center",
  },
});
