import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import {
  colors,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from "../../../theme";
import type { QuizSettings } from "../lib/types";
import { BOARD_ORIENTATIONS, FEEDBACK_SPEEDS } from "../lib/types";

type SettingsFormProps = {
  settings: QuizSettings;
  onUpdateSetting: <K extends keyof QuizSettings>(
    key: K,
    value: QuizSettings[K],
  ) => void;
};

const DURATION_OPTIONS = [30, 60, 90, 120];

export function SettingsForm({ settings, onUpdateSetting }: SettingsFormProps) {
  const { t } = useTranslation();

  const renderOptionButton = <T extends string>(
    value: T,
    isSelected: boolean,
    onPress: () => void,
    label: string,
  ) => (
    <TouchableOpacity
      key={value}
      onPress={onPress}
      style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
    >
      <Text
        style={[styles.optionText, isSelected && styles.optionTextSelected]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Duration */}
      <View style={styles.section}>
        <Text style={styles.label}>{t("coordinateQuiz.setup.duration")}</Text>
        <View style={styles.optionsRow}>
          {DURATION_OPTIONS.map((duration) =>
            renderOptionButton(
              duration.toString(),
              settings.duration === duration,
              () => onUpdateSetting("duration", duration),
              t("coordinateQuiz.setup.durationSeconds", { seconds: duration }),
            ),
          )}
        </View>
      </View>

      {/* Orientation */}
      <View style={styles.section}>
        <Text style={styles.label}>
          {t("coordinateQuiz.setup.orientation")}
        </Text>
        <View style={styles.optionsRow}>
          {BOARD_ORIENTATIONS.map((orientation) =>
            renderOptionButton(
              orientation,
              settings.orientation === orientation,
              () => onUpdateSetting("orientation", orientation),
              t(`coordinateQuiz.setup.orientation${capitalize(orientation)}`),
            ),
          )}
        </View>
      </View>

      {/* Feedback Speed */}
      <View style={styles.section}>
        <Text style={styles.label}>
          {t("coordinateQuiz.setup.feedbackSpeed")}
        </Text>
        <View style={styles.optionsRow}>
          {FEEDBACK_SPEEDS.map((speed) =>
            renderOptionButton(
              speed,
              settings.feedbackSpeed === speed,
              () => onUpdateSetting("feedbackSpeed", speed),
              t(`coordinateQuiz.setup.feedback${capitalize(speed)}`),
            ),
          )}
        </View>
      </View>
    </View>
  );
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  optionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
  },
  optionButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
});
