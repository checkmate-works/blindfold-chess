import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  touchTarget,
} from "../../../theme";

type LegalIllegalButtonsProps = {
  onAnswer: (isLegal: boolean) => void;
  disabled: boolean;
};

export function LegalIllegalButtons({
  onAnswer,
  disabled,
}: LegalIllegalButtonsProps) {
  const { t } = useTranslation();
  const { feedbackColors } = useTheme();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => onAnswer(true)}
        disabled={disabled}
        activeOpacity={0.7}
        style={[
          styles.button,
          styles.legalButton,
          { backgroundColor: feedbackColors.successSoft },
          disabled && styles.disabled,
        ]}
      >
        <Text style={[styles.icon, { color: feedbackColors.success }]}>○</Text>
        <Text style={[styles.label, { color: feedbackColors.success }]}>
          {t("legalMoves.session.legal")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onAnswer(false)}
        disabled={disabled}
        activeOpacity={0.7}
        style={[
          styles.button,
          styles.illegalButton,
          { backgroundColor: feedbackColors.errorSoft },
          disabled && styles.disabled,
        ]}
      >
        <Text style={[styles.icon, { color: feedbackColors.error }]}>×</Text>
        <Text style={[styles.label, { color: feedbackColors.error }]}>
          {t("legalMoves.session.illegal")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minHeight: touchTarget.minSize,
  },
  legalButton: {
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  illegalButton: {
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  disabled: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
  },
  label: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
});
