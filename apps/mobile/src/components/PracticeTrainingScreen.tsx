import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "./Button";
import { Screen } from "./Screen";
import { ScoreFooter } from "./ScoreFooter";
import { useTheme, spacing } from "../theme";

type PracticeTrainingScreenProps = {
  /** False until the first question batch exists; renders a loading gate. */
  isReady: boolean;
  correctCount: number;
  incorrectCount: number;
  /**
   * Skips the current question. Shown above "End" when given — pass
   * `undefined` while a result is on screen to hide it, as the web does.
   */
  onSkip?: () => void;
  /** Leaves training. */
  onEnd: () => void;
  children: ReactNode;
};

/**
 * The frame every untimed training screen renders inside: the body, the
 * running score, and the way out (plus skip, for modules that have it).
 *
 * The counterpart of `PracticeSessionScreen` for training mode. There is no
 * countdown, clock or result screen — training never ends on its own — so
 * the player ends it, which goes back to the setup screen the training was
 * started from (the web goes back to the module page the same way). The
 * stack also keeps the header's back button and the swipe-back gesture on
 * this screen, since nothing is lost by leaving.
 */
export function PracticeTrainingScreen({
  isReady,
  correctCount,
  incorrectCount,
  onSkip,
  onEnd,
  children,
}: PracticeTrainingScreenProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (!isReady) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Screen edges={["bottom"]}>
      {children}

      <ScoreFooter
        correctCount={correctCount}
        incorrectCount={incorrectCount}
        style={styles.score}
      />

      <View style={styles.actions}>
        {onSkip && (
          <Button
            title={t("common.skip")}
            onPress={onSkip}
            variant="ghost"
            fullWidth
          />
        )}
        <Button
          title={t("common.endTraining")}
          onPress={onEnd}
          variant="outline"
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  score: {
    paddingBottom: spacing.md,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
});
