import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from "../theme";

type TimeLimitSettingsFormProps = {
  timeLimit: number;
  onUpdateTimeLimit: (timeLimit: number) => void;
  timeLimitLabel: string;
  formatSeconds: (seconds: number) => string;
};

const TIME_LIMIT_OPTIONS = [30, 60, 90, 120];

export function TimeLimitSettingsForm({
  timeLimit,
  onUpdateTimeLimit,
  timeLimitLabel,
  formatSeconds,
}: TimeLimitSettingsFormProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.foreground }]}>
          {timeLimitLabel}
        </Text>
        <View style={styles.optionsRow}>
          {TIME_LIMIT_OPTIONS.map((d) => (
            <TouchableOpacity
              key={d}
              onPress={() => onUpdateTimeLimit(d)}
              style={[
                styles.optionButton,
                {
                  borderColor: timeLimit === d ? colors.primary : colors.border,
                  backgroundColor:
                    timeLimit === d ? colors.primary : colors.card,
                },
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  {
                    color:
                      timeLimit === d
                        ? colors.primaryForeground
                        : colors.foreground,
                    fontWeight:
                      timeLimit === d ? fontWeight.medium : fontWeight.normal,
                  },
                ]}
              >
                {formatSeconds(d)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  optionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  optionText: {
    fontSize: fontSize.sm,
  },
});
