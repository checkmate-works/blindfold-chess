import { useRouter } from "expo-router";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus";
import type { OnboardingDestination } from "../features/onboarding/data/script";
import { armSignUpOffer } from "../features/onboarding/sign-up-offer";

/**
 * The AI's weakest setting: the first game is for getting used to playing
 * without the board, not for losing.
 */
const FIRST_GAME_SKILL_LEVEL = "1";

export default function Onboarding() {
  const router = useRouter();
  const { setCompleted } = useOnboardingStatus();

  // Await the flag: the tabs layout reads it on mount and would otherwise
  // send the player straight back here.
  const handleComplete = async (destination: OnboardingDestination | null) => {
    if (destination) await armSignUpOffer();
    await setCompleted();
    // Home goes underneath, so closing the first session lands there (where
    // the account offer opens) rather than on a setup screen. `dismissTo`
    // also covers a replay from settings, where home is already below.
    if (!destination && router.canGoBack()) {
      // Skipping a replay (opened from settings) goes back to where it was
      // opened; with no first session to start, home need not be below.
      router.back();
      return;
    }
    router.dismissTo("/");
    if (destination === "ai-game") {
      router.push({
        pathname: "/play/ai-game/session",
        params: { playerColor: "white", skillLevel: FIRST_GAME_SKILL_LEVEL },
      });
    } else if (destination === "practice") {
      // Training, not the timed challenge: no clock and no mistake limit.
      router.push({
        pathname: "/practice/coordinate-quiz/training",
        params: { orientation: "white" },
      });
    }
  };

  return <OnboardingScreen onComplete={handleComplete} />;
}
