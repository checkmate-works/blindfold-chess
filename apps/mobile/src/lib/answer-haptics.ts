import * as Haptics from "expo-haptics";

/**
 * The success / error buzz every practice screen gives on an answer. Shaped
 * as the `onAnswerEffect` of the timed session hooks and the
 * `onFeedbackStart` of `useBatchTrainingSession`, so the timed and training
 * screens of a module feel the same.
 */
export function answerHaptics(correct: boolean): void {
  void Haptics.notificationAsync(
    correct
      ? Haptics.NotificationFeedbackType.Success
      : Haptics.NotificationFeedbackType.Error,
  );
}
