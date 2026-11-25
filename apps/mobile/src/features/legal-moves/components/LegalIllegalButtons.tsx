import { StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";

import { AnswerPair } from "../../../components";
import { fontSize, fontWeight, spacing, useTheme } from "../../../theme";

type LegalIllegalButtonsProps = {
  /** Omitted → a picture of the buttons (the setup demo): nothing to press. */
  onAnswer?: (isLegal: boolean) => void;
  disabled?: boolean;
  /** The answer just given and its verdict (`AnswerPair`'s ring). */
  selected?: { isLegal: boolean; correct: boolean } | null;
  /** The setup demo's smaller pair (the web's `px-4 py-2 text-sm`). */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * The ○ can / × cannot pair under a legal-moves question, tinted green and
 * red as the web's: a tenth of the colour behind, a third of it around.
 */
export function LegalIllegalButtons({
  onAnswer,
  disabled = false,
  selected = null,
  compact = false,
  style,
}: LegalIllegalButtonsProps) {
  const { t } = useTranslation();
  const { feedbackColors } = useTheme();

  return (
    <AnswerPair
      options={[
        {
          value: true,
          mark: "○",
          label: t("legalMoves.session.legal"),
          backgroundColor: feedbackColors.successSoft,
          textColor: feedbackColors.success,
          borderColor: "rgba(34, 197, 94, 0.3)",
          testID: "answer-legal",
        },
        {
          value: false,
          mark: "×",
          label: t("legalMoves.session.illegal"),
          backgroundColor: feedbackColors.errorSoft,
          textColor: feedbackColors.error,
          borderColor: "rgba(239, 68, 68, 0.3)",
          testID: "answer-illegal",
        },
      ]}
      onAnswer={onAnswer}
      disabled={disabled}
      selected={
        selected && { value: selected.isLegal, correct: selected.correct }
      }
      style={[compact ? styles.compactRow : styles.row, style]}
      buttonStyle={compact ? styles.compactButton : styles.button}
      labelStyle={compact ? styles.compactLabel : styles.label}
      markStyle={compact && styles.compactMark}
    />
  );
}

const styles = StyleSheet.create({
  // The web's `grid-cols-2 gap-4`, across the panel's whole width.
  row: {
    gap: spacing.md,
  },
  // The web's `px-6 py-4`.
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  // The web's `font-medium text-lg`.
  label: {
    fontWeight: fontWeight.medium,
  },
  // The demo's `gap-3 max-w-[200px]`.
  compactRow: {
    gap: 12,
    maxWidth: 200,
  },
  // The demo's `px-4 py-2 gap-1`.
  compactButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  // The demo's `text-sm` label and `text-lg` mark.
  compactLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  compactMark: {
    fontSize: fontSize.lg,
  },
});
