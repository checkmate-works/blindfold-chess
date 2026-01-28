import { useRouter } from "expo-router";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus";

export default function Onboarding() {
  const router = useRouter();
  const { setCompleted } = useOnboardingStatus();

  const handleComplete = () => {
    setCompleted();
    router.replace("/(tabs)");
  };

  return <OnboardingScreen onComplete={handleComplete} />;
}
