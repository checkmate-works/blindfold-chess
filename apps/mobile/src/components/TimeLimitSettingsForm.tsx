import { View, StyleSheet } from "react-native";
import { spacing } from "../theme";
import { OptionsField } from "./OptionsField";

type TimeLimitSettingsFormProps = {
  timeLimit: number;
  onUpdateTimeLimit: (timeLimit: number) => void;
  timeLimitLabel: string;
  formatSeconds: (seconds: number) => string;
};

/** The durations every timed practice module offers, in seconds. */
export const TIME_LIMIT_OPTIONS = [30, 60, 90, 120];

/**
 * The whole settings form for a module whose only setting is a time limit
 * (square-colors, board-symmetry, diagonal-quiz).
 *
 * Modules with further settings compose `OptionsField` directly rather than
 * nesting this — see `legal-moves` and `coordinate-quiz`.
 */
export function TimeLimitSettingsForm({
  timeLimit,
  onUpdateTimeLimit,
  timeLimitLabel,
  formatSeconds,
}: TimeLimitSettingsFormProps) {
  return (
    <View style={styles.container}>
      <OptionsField
        label={timeLimitLabel}
        options={TIME_LIMIT_OPTIONS}
        value={timeLimit}
        onChange={onUpdateTimeLimit}
        formatOption={formatSeconds}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
});
