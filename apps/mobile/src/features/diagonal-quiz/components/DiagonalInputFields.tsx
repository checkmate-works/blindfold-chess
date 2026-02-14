import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from "../../../theme";
import type { ActiveField } from "../hooks";

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
};

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
}: DiagonalInputFieldsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const getFieldStyle = (
    field: ActiveField,
    isStart: boolean,
    hasText: boolean,
    isFieldComplete: boolean,
  ) => {
    const isActive = activeField === field && !disabled;
    const isActivePosition = isStart ? isInputtingStart : isInputtingEnd;

    if (isActive && isActivePosition) {
      return {
        borderColor: colors.primary,
        backgroundColor: colors.background,
      };
    }
    if (isFieldComplete || hasText) {
      return {
        borderColor: colors.border,
        backgroundColor: colors.muted,
      };
    }
    return {
      borderColor: colors.border,
      backgroundColor: colors.background,
    };
  };

  const renderField = (
    field: ActiveField,
    label: string,
    startText: string,
    endText: string,
    isSingle: boolean,
    isFieldComplete: boolean,
    singleLabel?: string,
  ) => (
    <View style={styles.fieldContainer}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {label}
        </Text>
        {isSingle && singleLabel && (
          <Text style={[styles.singleLabel, { color: colors.mutedForeground }]}>
            ({singleLabel})
          </Text>
        )}
      </View>
      {isSingle ? (
        <TouchableOpacity
          onPress={() => onFieldPress(field)}
          disabled={disabled}
          activeOpacity={0.7}
          style={[
            styles.inputBox,
            getFieldStyle(field, true, !!startText, isFieldComplete),
            activeField === field &&
              !disabled && {
                borderWidth: 2,
              },
            disabled && styles.disabledField,
          ]}
        >
          <Text
            style={[
              styles.inputText,
              {
                color: startText ? colors.foreground : colors.mutedForeground,
              },
            ]}
          >
            {startText || t("diagonalQuiz.session.singleSquarePlaceholder")}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.splitFieldRow}>
          <TouchableOpacity
            onPress={() => onFieldPress(field)}
            disabled={disabled}
            activeOpacity={0.7}
            style={[
              styles.inputBox,
              styles.splitInput,
              getFieldStyle(field, true, !!startText, isFieldComplete),
              activeField === field &&
                !disabled &&
                isInputtingStart && {
                  borderWidth: 2,
                },
              disabled && styles.disabledField,
            ]}
          >
            <Text
              style={[
                styles.inputText,
                {
                  color: startText ? colors.foreground : colors.mutedForeground,
                },
              ]}
            >
              {startText || t("diagonalQuiz.session.squarePlaceholder")}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.hyphen, { color: colors.mutedForeground }]}>
            -
          </Text>
          <TouchableOpacity
            onPress={() => onFieldPress(field)}
            disabled={disabled}
            activeOpacity={0.7}
            style={[
              styles.inputBox,
              styles.splitInput,
              getFieldStyle(field, false, !!endText, isFieldComplete),
              activeField === field &&
                !disabled &&
                isInputtingEnd && {
                  borderWidth: 2,
                },
              disabled && styles.disabledField,
            ]}
          >
            <Text
              style={[
                styles.inputText,
                {
                  color: endText ? colors.foreground : colors.mutedForeground,
                },
              ]}
            >
              {endText || t("diagonalQuiz.session.squarePlaceholder")}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {renderField(
        "diagonal",
        t("diagonalQuiz.session.diagonalLabel"),
        diagonalStartText,
        diagonalEndText,
        singleDiagonal,
        isDiagonalComplete,
        t("diagonalQuiz.session.singleSquare"),
      )}
      {renderField(
        "antiDiagonal",
        t("diagonalQuiz.session.antiDiagonalLabel"),
        antiDiagonalStartText,
        antiDiagonalEndText,
        singleAntiDiagonal,
        isAntiDiagonalComplete,
        t("diagonalQuiz.session.singleSquare"),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  fieldContainer: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  singleLabel: {
    fontSize: fontSize.xs,
  },
  splitFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  inputBox: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  splitInput: {
    flex: 1,
  },
  inputText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    fontVariant: ["tabular-nums"],
  },
  hyphen: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  disabledField: {
    opacity: 0.5,
  },
});
