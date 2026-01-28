import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus";

export default function Index() {
  const router = useRouter();
  const { isLoading, hasCompleted } = useOnboardingStatus();

  useEffect(() => {
    if (!isLoading) {
      if (hasCompleted) {
        router.replace("/(tabs)");
      } else {
        router.replace("/onboarding");
      }
    }
  }, [isLoading, hasCompleted, router]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
      }}
    >
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}
