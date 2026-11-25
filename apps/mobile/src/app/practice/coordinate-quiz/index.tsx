import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { HowToPlaySection, PracticeSetupScreen } from "../../../components";
import { ChallengeRulesNote } from "../../../features/challenge/ChallengeRulesNote";
import {
  HowToPlayBoard,
  SettingsForm,
} from "../../../features/coordinate-quiz/components";
import { useQuizSettings } from "../../../features/coordinate-quiz/hooks";
import type { QuizSettings } from "../../../features/coordinate-quiz/lib/types";

export default function CoordinateQuizSetup() {
  const router = useRouter();
  const { t } = useTranslation();
  const { settings, isLoaded, updateSettings } = useQuizSettings();

  const handleStartQuiz = () => {
    router.push({
      pathname: "/practice/coordinate-quiz/session",
      params: { orientation: settings.orientation },
    });
  };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded}
      onStart={handleStartQuiz}
      onStartTraining={() =>
        router.push({
          pathname: "/practice/coordinate-quiz/training",
          params: { orientation: settings.orientation },
        })
      }
    >
      <HowToPlaySection
        title={t("moduleHelp.coordinateQuiz.howToPlay.title")}
        description={t("moduleHelp.coordinateQuiz.howToPlay.body")}
      >
        <HowToPlayBoard />
      </HowToPlaySection>
      <SettingsForm
        settings={settings}
        onUpdateSetting={(key, value) =>
          updateSettings({ [key]: value } as Partial<QuizSettings>)
        }
      />
      <ChallengeRulesNote />
    </PracticeSetupScreen>
  );
}
