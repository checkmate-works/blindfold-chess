import type { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CountdownOverlay } from "./CountdownOverlay";
import { QuizTimer } from "./QuizTimer";
import { ScoreFooter } from "./ScoreFooter";
import { useTheme, spacing } from "../theme";

type PracticeSessionScreenProps = {
  /** Seconds left on the "get ready" overlay, or null once the quiz is live. */
  countdown: number | null;
  timeRemaining: number;
  /** Fraction of the time limit still on the clock, 0–1. */
  progress: number;
  correctCount: number;
  incorrectCount: number;
  /** Tightens the score footer's spacing where the body already pads itself. */
  footerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * The frame every timed practice session renders inside: the countdown
 * overlay, the clock in the top-right, the body, and the running score.
 *
 * @description
 * Sibling of `PracticeSetupScreen` and `PracticeResultScreen` — the third
 * screen in each module's flow, and the only one that had no shared frame.
 * The four modules that use it had each written the same `SafeAreaView`, the
 * same `{countdown === null && ...}` gate, the same right-aligned timer row,
 * and the same `container` / `timerRow` / `spacer` StyleSheet entries.
 *
 * `coordinate-quiz` and `route-planner` deliberately do NOT use this. The
 * first threads its timer into a turn-indicator row rather than a row of its
 * own; the second has no clock at all and swaps its whole body for a result
 * card between problems. Bending either into this frame would take flags for
 * chrome they simply do not have.
 */
export function PracticeSessionScreen({
  countdown,
  timeRemaining,
  progress,
  correctCount,
  incorrectCount,
  footerStyle,
  children,
}: PracticeSessionScreenProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <CountdownOverlay countdown={countdown} />

      {countdown === null && (
        <>
          <View style={styles.timerRow}>
            <View style={styles.spacer} />
            <QuizTimer
              timeRemaining={timeRemaining}
              progress={progress}
              size={50}
            />
          </View>

          {children}

          <ScoreFooter
            correctCount={correctCount}
            incorrectCount={incorrectCount}
            style={footerStyle}
          />
        </>
      )}
    </SafeAreaView>
  );
}

/**
 * Body-section styles shared by the session screens above. Kept beside the
 * frame rather than copied into each module, since a change to the question
 * area's padding should move all of them together.
 */
export const practiceSessionStyles = StyleSheet.create({
  /** Centres the question in the space between the timer and the input. */
  questionContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  /** The input area sitting directly above the score footer. */
  bottomSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  spacer: {
    flex: 1,
  },
});
