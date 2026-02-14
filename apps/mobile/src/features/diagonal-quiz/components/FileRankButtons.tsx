import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { Delete } from "lucide-react-native";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  touchTarget,
} from "../../../theme";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"];

type FileRankButtonsProps = {
  expectingFile: boolean;
  expectingRank: boolean;
  disabled: boolean;
  onFilePress: (file: string) => void;
  onRankPress: (rank: string) => void;
  onBackspace: () => void;
  onClear: () => void;
};

export function FileRankButtons({
  expectingFile,
  expectingRank,
  disabled,
  onFilePress,
  onRankPress,
  onBackspace,
  onClear,
}: FileRankButtonsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const fileEnabled = !disabled && expectingFile;
  const rankEnabled = !disabled && expectingRank;

  return (
    <View style={styles.container}>
      {/* Step indicator */}
      {!disabled && (
        <Text style={[styles.stepIndicator, { color: colors.mutedForeground }]}>
          {expectingFile
            ? t("diagonalQuiz.session.selectFile")
            : expectingRank
              ? t("diagonalQuiz.session.selectRank")
              : ""}
        </Text>
      )}

      {/* File buttons */}
      <View style={styles.buttonRow}>
        {FILES.map((file) => (
          <TouchableOpacity
            key={file}
            onPress={() => onFilePress(file)}
            disabled={!fileEnabled}
            activeOpacity={0.7}
            style={[
              styles.button,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                opacity: fileEnabled ? 1 : 0.3,
              },
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                {
                  color: fileEnabled
                    ? colors.foreground
                    : colors.mutedForeground,
                },
              ]}
            >
              {file}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Rank buttons */}
      <View style={styles.buttonRow}>
        {RANKS.map((rank) => (
          <TouchableOpacity
            key={rank}
            onPress={() => onRankPress(rank)}
            disabled={!rankEnabled}
            activeOpacity={0.7}
            style={[
              styles.button,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                opacity: rankEnabled ? 1 : 0.3,
              },
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                {
                  color: rankEnabled
                    ? colors.foreground
                    : colors.mutedForeground,
                },
              ]}
            >
              {rank}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={onBackspace}
          disabled={disabled}
          activeOpacity={0.7}
          style={[
            styles.actionButton,
            {
              borderColor: colors.border,
              backgroundColor: colors.background,
              opacity: disabled ? 0.3 : 1,
            },
          ]}
        >
          <Delete
            size={20}
            color={disabled ? colors.mutedForeground : colors.foreground}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onClear}
          disabled={disabled}
          activeOpacity={0.7}
          style={[
            styles.actionButton,
            {
              borderColor: colors.border,
              backgroundColor: colors.background,
              opacity: disabled ? 0.3 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.buttonText,
              {
                color: disabled ? colors.mutedForeground : colors.foreground,
              },
            ]}
          >
            {t("diagonalQuiz.session.clear")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  stepIndicator: {
    fontSize: fontSize.sm,
    textAlign: "center",
    minHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
  },
  button: {
    flex: 1,
    minHeight: touchTarget.minSize,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    fontVariant: ["tabular-nums"],
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionButton: {
    flex: 1,
    minHeight: touchTarget.minSize,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
