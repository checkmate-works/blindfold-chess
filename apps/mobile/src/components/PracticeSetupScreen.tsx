import type { ReactNode } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "./Button";
import { useTheme, spacing } from "../theme";

type PracticeSetupScreenProps = {
  /** From the feature's settings hook; false renders the loading gate. */
  isLoaded: boolean;
  startLabel: string;
  /** Navigates to the feature's session screen with its own params. */
  onStart: () => void;
  /** The feature's settings form. */
  children: ReactNode;
};

/**
 * Shared layout for every practice setup screen: a loading gate while the
 * persisted settings hydrate, the scrollable settings form, and a start
 * button pinned to a bordered footer.
 */
export function PracticeSetupScreen({
  isLoaded,
  startLabel,
  onStart,
  children,
}: PracticeSetupScreenProps) {
  const { colors } = useTheme();

  if (!isLoaded) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        <Button title={startLabel} onPress={onStart} size="lg" fullWidth />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
});
