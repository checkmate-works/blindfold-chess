import { Screen } from "./Screen";
import type { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CountdownOverlay } from "./CountdownOverlay";
import { LivesIndicator } from "./LivesIndicator";
import { QuizTimer } from "./QuizTimer";
import { ScoreFooter } from "./ScoreFooter";
import { SessionCloseButton } from "../navigation/SessionCloseButton";
import { spacing } from "../theme";

type PracticeSessionScreenProps = {
  /** Seconds left on the "get ready" overlay, or null once the quiz is live. */
  countdown: number | null;
  timeRemaining: number;
  /** Fraction of the time limit still on the clock, 0–1. */
  progress: number;
  correctCount: number;
  incorrectCount: number;
  /**
   * Hearts for a session with a mistake limit, shown beside the close
   * button — the left end of the top row, where the web's
   * `ChallengeStatusHeader` puts them. Omitted → no hearts.
   */
  lives?: { readonly remaining: number; readonly max: number };
  /** Tightens the score footer's spacing where the body already pads itself. */
  footerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * The frame every timed practice session renders inside: the countdown
 * overlay, the top row (close button and hearts on the left, the clock on the
 * right), the body, and the running score.
 *
 * @description
 * Sibling of `PracticeSetupScreen` and `PracticeResultScreen` — the third
 * screen in each timed module's flow. It holds what every timed session
 * would otherwise repeat: the safe area, the `{countdown === null && ...}`
 * gate, the right-aligned timer row and the score footer.
 *
 * The untimed sessions (fen, knight-tour, position-memory, recall, puzzle) have
 * no countdown or clock, so there is nothing here for them.
 */
export function PracticeSessionScreen({
  countdown,
  timeRemaining,
  progress,
  correctCount,
  incorrectCount,
  lives,
  footerStyle,
  children,
}: PracticeSessionScreenProps) {
  // The top inset is padded from the provider's value rather than left to
  // `Screen`'s `SafeAreaView`: in this header-less screen of the
  // full-screen session modal the view's own top inset came out as 0 on iOS
  // (Expo SDK 58, iPhone 17 simulator), so the close button, hearts and clock
  // sat under the status bar.
  const insets = useSafeAreaInsets();
  return (
    <Screen
      edges={["bottom", "left", "right"]}
      style={{ paddingTop: insets.top }}
    >
      <CountdownOverlay countdown={countdown} />

      {countdown === null && (
        <>
          <View style={styles.timerRow}>
            <View style={styles.leading}>
              <SessionCloseButton confirm />
              {lives && (
                <LivesIndicator remaining={lives.remaining} max={lives.max} />
              )}
            </View>
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
    </Screen>
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
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  leading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  spacer: {
    flex: 1,
  },
});
