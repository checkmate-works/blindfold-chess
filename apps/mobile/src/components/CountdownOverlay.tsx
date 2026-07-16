import { View, Text, StyleSheet } from "react-native";

import { useTheme, fontWeight } from "../theme";

type CountdownOverlayProps = {
  /** Seconds remaining before the session starts; null once it has started. */
  countdown: number | null;
};

/**
 * Full-screen pre-session countdown ("3, 2, 1, START!") shared by every
 * practice session screen. Renders nothing once the countdown is over.
 */
export function CountdownOverlay({ countdown }: CountdownOverlayProps) {
  const { colors } = useTheme();

  if (countdown === null) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: colors.primary }]}>
        {countdown > 0 ? countdown : "START!"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 72,
    fontWeight: fontWeight.bold,
  },
});
