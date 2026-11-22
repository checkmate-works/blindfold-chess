import { useRouter } from "expo-router";

import { PracticeSetupScreen } from "../../../components";
import { ChallengeRulesNote } from "../../../features/challenge/ChallengeRulesNote";

/** Square colours: the challenge (fixed rules) or untimed training. */
export default function SquareColorsSetup() {
  const router = useRouter();

  return (
    <PracticeSetupScreen
      isLoaded
      onStart={() => router.push("/practice/square-colors/session")}
      onStartTraining={() => router.push("/practice/square-colors/training")}
    >
      <ChallengeRulesNote />
    </PracticeSetupScreen>
  );
}
