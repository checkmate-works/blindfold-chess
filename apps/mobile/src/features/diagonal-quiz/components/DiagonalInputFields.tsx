import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { fontSize, fontWeight, spacing, useTheme } from "../../../theme";
import type { ActiveField } from "../hooks";

/** The web's `font-mono`. */
const MONO = Platform.OS === "ios" ? "Menlo" : "monospace";

/** The verdict on one field, shown in place of its usual state. */
export type FieldResult = "correct" | "incorrect" | null;

type DiagonalInputFieldsProps = {
  diagonalStartText: string;
  diagonalEndText: string;
  antiDiagonalStartText: string;
  antiDiagonalEndText: string;
  activeField: ActiveField;
  isDiagonalComplete: boolean;
  isAntiDiagonalComplete: boolean;
  isInputtingStart: boolean;
  isInputtingEnd: boolean;
  singleDiagonal: boolean;
  singleAntiDiagonal: boolean;
  disabled: boolean;
  onFieldPress: (field: ActiveField) => void;
  /**
   * Tints each field green or red while an answer's verdict shows, as the
   * web does instead of a "Correct" line, so nothing moves when it appears.
   * Two values: the challenge grades the diagonals apart, so a half-right
   * answer shows one green field and one red.
   */
  diagonalResult?: FieldResult;
  antiDiagonalResult?: FieldResult;
};

/**
 * The two answer fields, as the web's `DiagonalInputField`: a label over
 * "?? - ??" (one box for a corner's single-square line), the box being
 * typed into ringed in the primary colour.
 */
export function DiagonalInputFields({
  diagonalStartText,
  diagonalEndText,
  antiDiagonalStartText,
  antiDiagonalEndText,
  activeField,
  isDiagonalComplete,
  isAntiDiagonalComplete,
  isInputtingStart,
  isInputtingEnd,
  singleDiagonal,
  singleAntiDiagonal,
  disabled,
  onFieldPress,
  diagonalResult = null,
  antiDiagonalResult = null,
}: DiagonalInputFieldsProps) {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();

  const boxStyle = (
    isActive: boolean,
    hasText: boolean,
    result: FieldResult,
  ) => {
    // The verdict outranks the usual active / filled / empty states.
    if (result === "correct") {
      return {
        borderColor: feedbackColors.success,
        backgroundColor: feedbackColors.successSoft,
      };
    }
    if (result === "incorrect") {
      return {
        borderColor: feedbackColors.error,
        backgroundColor: feedbackColors.errorSoft,
      };
    }
    if (isActive) {
      return {
        borderColor: colors.primary,
        backgroundColor: colors.background,
      };
    }
    return {
      borderColor: colors.border,
      backgroundColor: hasText ? colors.muted : colors.background,
    };
  };

  const renderBox = (
    field: ActiveField,
    text: string,
    placeholder: string,
    isActive: boolean,
    hasText: boolean,
    result: FieldResult,
    flex: boolean,
  ) => (
    <TouchableOpacity
      onPress={() => onFieldPress(field)}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.box,
        flex && styles.flex,
        boxStyle(isActive, hasText, result),
        // The verdict tint stays at full strength; only an idle field dims.
        disabled && result === null && styles.disabled,
      ]}
    >
      {/* The web's `ring-2 ring-primary/30`, drawn outside the border so the
          box keeps its size. */}
      {isActive && result === null && (
        <View
          pointerEvents="none"
          style={[styles.ring, { borderColor: colors.primary }]}
        />
      )}
      <Text
        style={[
          styles.text,
          { color: text ? colors.foreground : colors.mutedForeground },
          !text && styles.placeholder,
        ]}
      >
        {text || placeholder}
      </Text>
    </TouchableOpacity>
  );

  const renderField = (
    field: ActiveField,
    label: string,
    startText: string,
    endText: string,
    isSingle: boolean,
    isFieldComplete: boolean,
    result: FieldResult,
  ) => {
    const isActiveField = activeField === field && !disabled;
    return (
      <View>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {label}
          {isSingle && (
            <Text style={styles.singleLabel}>
              {" "}
              ({t("diagonalQuiz.session.singleSquare")})
            </Text>
          )}
        </Text>
        {isSingle ? (
          renderBox(
            field,
            startText,
            t("diagonalQuiz.session.singleSquarePlaceholder"),
            isActiveField,
            isFieldComplete,
            result,
            false,
          )
        ) : (
          <View style={styles.splitRow}>
            {renderBox(
              field,
              startText,
              t("diagonalQuiz.session.squarePlaceholder"),
              isActiveField && isInputtingStart,
              !!startText,
              result,
              true,
            )}
            <Text style={[styles.hyphen, { color: colors.mutedForeground }]}>
              -
            </Text>
            {renderBox(
              field,
              endText,
              t("diagonalQuiz.session.squarePlaceholder"),
              isActiveField && isInputtingEnd,
              !!endText,
              result,
              true,
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderField(
        "diagonal",
        t("diagonalQuiz.session.diagonalLabel"),
        diagonalStartText,
        diagonalEndText,
        singleDiagonal,
        isDiagonalComplete,
        diagonalResult,
      )}
      {renderField(
        "antiDiagonal",
        t("diagonalQuiz.session.antiDiagonalLabel"),
        antiDiagonalStartText,
        antiDiagonalEndText,
        singleAntiDiagonal,
        isAntiDiagonalComplete,
        antiDiagonalResult,
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // The web's `space-y-3`.
  container: {
    gap: 12,
  },
  // The web's `text-sm font-medium mb-1`.
  label: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  // The web's `text-xs text-muted-foreground/70`.
  singleLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
    opacity: 0.7,
  },
  splitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  // The web's `px-4 py-3 rounded-lg border text-lg`.
  box: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: {
    flex: 1,
  },
  ring: {
    position: "absolute",
    top: -3,
    right: -3,
    bottom: -3,
    left: -3,
    borderRadius: 11,
    borderWidth: 2,
    opacity: 0.3,
  },
  text: {
    fontFamily: MONO,
    fontSize: fontSize.lg,
    lineHeight: 28,
  },
  // The web's `text-muted-foreground/50`.
  placeholder: {
    opacity: 0.5,
  },
  hyphen: {
    fontFamily: MONO,
    fontSize: fontSize.lg,
  },
  disabled: {
    opacity: 0.5,
  },
});
