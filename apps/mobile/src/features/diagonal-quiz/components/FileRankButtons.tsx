import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { Delete } from "lucide-react-native";
import {
  CoordinateKeyRow,
  FILE_KEYS,
  RANK_KEYS,
  coordinateKeypadStyles,
} from "../../../components";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  touchTarget,
} from "../../../theme";

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

  return (
    <View style={styles.container}>
      {!disabled && (
        <Text
          style={[
            coordinateKeypadStyles.stepIndicator,
            { color: colors.mutedForeground },
          ]}
        >
          {expectingFile
            ? t("diagonalQuiz.session.selectFile")
            : expectingRank
              ? t("diagonalQuiz.session.selectRank")
              : ""}
        </Text>
      )}

      {/* No `activeKey`: an entered file goes straight into the answer string
          above, so there is nothing half-entered to highlight on the pad. */}
      <CoordinateKeyRow
        keys={FILE_KEYS}
        enabled={!disabled && expectingFile}
        onPress={onFilePress}
      />

      <CoordinateKeyRow
        keys={RANK_KEYS}
        enabled={!disabled && expectingRank}
        onPress={onRankPress}
      />

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
              styles.actionButtonText,
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
  actionButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    fontVariant: ["tabular-nums"],
  },
});
