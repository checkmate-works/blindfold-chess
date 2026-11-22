import { useRouter } from "expo-router";

import { PracticeSetupScreen } from "../../../components";
import { ChallengeRulesNote } from "../../../features/challenge/ChallengeRulesNote";

/** The challenge (fixed rules) or untimed training. */
export default function DiagonalQuizSetup() {
  const router = useRouter();

  return (
    <PracticeSetupScreen
      isLoaded
      onStart={() => router.push("/practice/diagonal-quiz/session")}
      onStartTraining={() => router.push("/practice/diagonal-quiz/training")}
    >
      <ChallengeRulesNote />
    </PracticeSetupScreen>
  );
}
