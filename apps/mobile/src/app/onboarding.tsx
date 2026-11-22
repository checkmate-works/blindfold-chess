import { useRouter } from "expo-router";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus";

export default function Onboarding() {
  const router = useRouter();
  const { setCompleted } = useOnboardingStatus();

  // Await the flag: the tabs layout reads it on mount and would otherwise
  // send the player straight back here.
  const handleComplete = async () => {
    await setCompleted();
    router.replace("/");
  };

  return <OnboardingScreen onComplete={handleComplete} />;
}
