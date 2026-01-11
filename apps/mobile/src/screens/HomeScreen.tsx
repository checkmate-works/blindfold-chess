import React from "react";
import { StyleSheet, Text, View, Button } from "react-native";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus";

export const HomeScreen = () => {
  const { clearStatus } = useOnboardingStatus();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Home Screen</Text>
      <Text>Welcome back!</Text>
      <Button title="Reset Onboarding (Debug)" onPress={clearStatus} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 24,
    marginBottom: 20,
  },
});
