import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus";
import { useTheme } from "../theme";

export default function Index() {
  const router = useRouter();
  const { isLoading, hasCompleted } = useOnboardingStatus();
  const { colors } = useTheme();

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
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
