import { useRouter } from "expo-router";

import { PracticeSetupScreen } from "../../../components";
import { ChallengeRulesNote } from "../../../features/challenge/ChallengeRulesNote";
import { SettingsForm } from "../../../features/coordinate-quiz/components";
import { useQuizSettings } from "../../../features/coordinate-quiz/hooks";
import type { QuizSettings } from "../../../features/coordinate-quiz/lib/types";

export default function CoordinateQuizSetup() {
  const router = useRouter();
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
