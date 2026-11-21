import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { OptionsField } from "../../../components";
import { spacing } from "../../../theme";
import type { QuizSettings } from "../lib/types";
import { BOARD_ORIENTATIONS } from "../lib/types";

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
        label={t("coordinateQuiz.setup.orientation")}
        options={BOARD_ORIENTATIONS}
        value={settings.orientation}
        onChange={(orientation) => onUpdateSetting("orientation", orientation)}
        formatOption={(orientation) =>
          // coordinateQuiz.setup.orientationWhite, coordinateQuiz.setup.orientationBlack, coordinateQuiz.setup.orientationRandom (BOARD_ORIENTATIONS)
          t(`coordinateQuiz.setup.orientation${capitalize(orientation)}`)
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
