import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { OptionsField, TIME_LIMIT_OPTIONS } from "../../../components";
import { spacing } from "../../../theme";
import type { QuizSettings } from "../lib/types";
import { BOARD_ORIENTATIONS, FEEDBACK_SPEEDS } from "../lib/types";

type SettingsFormProps = {
  settings: QuizSettings;
  onUpdateSetting: <K extends keyof QuizSettings>(
    key: K,
    value: QuizSettings[K],
  ) => void;
};

export function SettingsForm({ settings, onUpdateSetting }: SettingsFormProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <OptionsField
        label={t("coordinateQuiz.setup.duration")}
        options={TIME_LIMIT_OPTIONS}
        value={settings.timeLimit}
        onChange={(duration) => onUpdateSetting("timeLimit", duration)}
        formatOption={(duration) =>
          t("coordinateQuiz.setup.durationSeconds", { seconds: duration })
        }
      />

      <OptionsField
        label={t("coordinateQuiz.setup.orientation")}
        options={BOARD_ORIENTATIONS}
        value={settings.orientation}
        onChange={(orientation) => onUpdateSetting("orientation", orientation)}
        formatOption={(orientation) =>
          t(`coordinateQuiz.setup.orientation${capitalize(orientation)}`)
        }
      />

      <OptionsField
        label={t("coordinateQuiz.setup.feedbackSpeed")}
        options={FEEDBACK_SPEEDS}
        value={settings.feedbackSpeed}
        onChange={(speed) => onUpdateSetting("feedbackSpeed", speed)}
        formatOption={(speed) =>
          t(`coordinateQuiz.setup.feedback${capitalize(speed)}`)
        }
      />
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
});
