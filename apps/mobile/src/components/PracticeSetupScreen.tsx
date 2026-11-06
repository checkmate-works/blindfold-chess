import { Screen } from "./Screen";
import type { ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "./Button";
import { useTheme, spacing, fontSize } from "../theme";

type PracticeSetupScreenProps = {
  /** From the feature's settings hook; false renders the loading gate. */
  isLoaded: boolean;
  startLabel: string;
  /** Navigates to the feature's session screen with its own params. */
  onStart: () => void;
  /** Disables the start buttons while the form holds input that cannot start. */
  startDisabled?: boolean;
  /**
   * Opens the module's untimed training screen. When given, the footer adds
   * a "Start Training" button under the timed one, with a line saying how
   * training ends; modules without a training mode omit it.
   */
  onStartTraining?: () => void;
  /** The feature's settings form. */
  children: ReactNode;
};

/**
 * Shared layout for every practice setup screen: a loading gate while the
 * persisted settings hydrate, the scrollable settings form, and a start
 * button pinned to a bordered footer. Modules with a training mode also get
 * a second start button for it there.
 */
export function PracticeSetupScreen({
  isLoaded,
  startLabel,
  onStart,
  startDisabled = false,
  onStartTraining,
  children,
}: PracticeSetupScreenProps) {
  const { t } = useTranslation();
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
    <Screen edges={["bottom"]}>
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
        <Button
          title={startLabel}
          onPress={onStart}
          disabled={startDisabled}
          size="lg"
          fullWidth
        />
        {onStartTraining && (
          <>
            <Button
              title={t("common.startTraining")}
              onPress={onStartTraining}
              disabled={startDisabled}
              variant="outline"
              size="lg"
              fullWidth
              style={styles.trainingButton}
            />
            <Text
              style={[
                styles.trainingDescription,
                { color: colors.mutedForeground },
              ]}
            >
              {t("common.trainingDescription")}
            </Text>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  trainingButton: {
    marginTop: spacing.sm,
  },
  trainingDescription: {
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
    textAlign: "center",
  },
});
