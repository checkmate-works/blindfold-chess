import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from "../../../theme";
import { FILES, RANKS } from "../lib/types";

type CoordinateSelectorProps = {
  selectedFile: string | null;
  selectedRank: string | null;
  onFileToggle: (file: string) => void;
  onRankToggle: (rank: string) => void;
  disabled?: boolean;
};

export function CoordinateSelector({
  selectedFile,
  selectedRank,
  onFileToggle,
  onRankToggle,
  disabled = false,
}: CoordinateSelectorProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      <View style={styles.row}>
        {FILES.map((file) => (
          <TouchableOpacity
            key={file}
            onPress={() => onFileToggle(file)}
            disabled={disabled}
            style={[
              styles.button,
              {
                borderColor:
                  selectedFile === file ? colors.primary : colors.border,
                backgroundColor:
                  selectedFile === file ? colors.primary : colors.card,
              },
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                {
                  color:
                    selectedFile === file
                      ? colors.primaryForeground
                      : colors.foreground,
                },
              ]}
            >
              {file}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        {RANKS.map((rank) => (
          <TouchableOpacity
            key={rank}
            onPress={() => onRankToggle(rank)}
            disabled={disabled}
            style={[
              styles.button,
              {
                borderColor:
                  selectedRank === rank ? colors.primary : colors.border,
                backgroundColor:
                  selectedRank === rank ? colors.primary : colors.card,
              },
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                {
                  color:
                    selectedRank === rank
                      ? colors.primaryForeground
                      : colors.foreground,
                },
              ]}
            >
              {rank}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  disabled: {
    opacity: 0.5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
});
