import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { PracticeSetupScreen } from "../../../../components";
import { SettingsForm } from "../../../../features/coordinate-quiz/components";
import { useQuizSettings } from "../../../../features/coordinate-quiz/hooks";
import type { QuizSettings } from "../../../../features/coordinate-quiz/lib/types";

export default function CoordinateQuizSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, isLoaded, updateSettings } = useQuizSettings();

  const handleStartQuiz = () => {
    router.push({
      pathname: "/(tabs)/practice/coordinate-quiz/session",
      params: {
        duration: settings.timeLimit.toString(),
        orientation: settings.orientation,
        feedbackSpeed: settings.feedbackSpeed,
      },
    });
  };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded}
      startLabel={t("coordinateQuiz.setup.startQuiz")}
      onStart={handleStartQuiz}
    >
      <SettingsForm
        settings={settings}
        onUpdateSetting={(key, value) =>
          updateSettings({ [key]: value } as Partial<QuizSettings>)
        }
      />
    </PracticeSetupScreen>
  );
}
