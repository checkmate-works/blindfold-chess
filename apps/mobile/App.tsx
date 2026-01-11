import { StatusBar } from "expo-status-bar";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { HomeScreen } from "./src/screens/HomeScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { useOnboardingStatus } from "./src/hooks/useOnboardingStatus";

export default function App() {
  const { isLoading, hasCompleted, setCompleted } = useOnboardingStatus();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {hasCompleted ? (
        <HomeScreen />
      ) : (
        <OnboardingScreen onComplete={setCompleted} />
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
