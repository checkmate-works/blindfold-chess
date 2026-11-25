import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { BoardOrientationSelector, SectionTitle } from "../../../components";
import type { QuizSettings } from "../lib/types";

type SettingsFormProps = {
  settings: QuizSettings;
  onUpdateSetting: <K extends keyof QuizSettings>(
    key: K,
    value: QuizSettings[K],
  ) => void;
};

/** The setup screen's "Game Settings" section: the board orientation. */
export function SettingsForm({ settings, onUpdateSetting }: SettingsFormProps) {
  const { t } = useTranslation();

  return (
    <View>
      <SectionTitle>{t("common.gameSettings")}</SectionTitle>
      <BoardOrientationSelector
        label={t("coordinateQuiz.setup.orientation")}
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
