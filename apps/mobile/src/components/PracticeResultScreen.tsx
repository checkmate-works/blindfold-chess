import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";

import { Button } from "./Button";
import { useTheme, fontSize, fontWeight, spacing } from "../theme";

type PracticeResultScreenProps = {
  title: string;
  playAgainLabel: string;
  backToMenuLabel: string;
  /** The feature's setup screen; "play again" replaces the route with it. */
  setupHref: Href;
  /** The result card rendered under the title. */
  children: ReactNode;
};

/**
 * Shared layout for every practice result screen: centered title + result
 * card, with "play again" / "back to menu" actions pinned to the bottom.
 */
export function PracticeResultScreen({
  title,
  playAgainLabel,
  backToMenuLabel,
  setupHref,
  children,
}: PracticeResultScreenProps) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {title}
        </Text>

        {children}
      </View>

      <View style={styles.footer}>
        <Button
          title={playAgainLabel}
          onPress={() => router.replace(setupHref)}
          size="lg"
          fullWidth
        />
        <Button
          title={backToMenuLabel}
          onPress={() => router.replace("/(tabs)/practice")}
          variant="ghost"
          size="md"
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: "center",
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
