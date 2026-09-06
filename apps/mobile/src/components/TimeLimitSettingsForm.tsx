import { useTranslation } from "react-i18next";
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

type TimeLimitOnlySettingsProps = {
  timeLimit: number;
  onUpdateTimeLimit: (timeLimit: number) => void;
};

/**
 * {@link TimeLimitSettingsForm} bound to one module's i18n namespace, as that
 * module's `SettingsForm`.
 *
 * square-colors, board-symmetry and diagonal-quiz each had this as a file of
 * its own, and the three were identical apart from the namespace in the two
 * message keys -- which is the only thing a module with no other setting gets
 * to decide.
 *
 * A module that grows a second setting stops calling this and writes its own
 * `SettingsForm` composing `OptionsField`, the way legal-moves and
 * coordinate-quiz already do. That is the intended exit, not a reason to add
 * parameters here.
 */
export function createTimeLimitSettingsForm(i18nNamespace: string) {
  return function SettingsForm({
    timeLimit,
    onUpdateTimeLimit,
  }: TimeLimitOnlySettingsProps) {
    const { t } = useTranslation();

    return (
      <TimeLimitSettingsForm
        timeLimit={timeLimit}
        onUpdateTimeLimit={onUpdateTimeLimit}
        timeLimitLabel={t(`${i18nNamespace}.settings.timeLimit`)}
        formatSeconds={(seconds) =>
          t(`${i18nNamespace}.settings.seconds`, { seconds })
        }
      />
    );
  };
}
