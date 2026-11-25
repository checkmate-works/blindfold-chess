import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { Delete } from "lucide-react-native";
import { CoordinateKeyRow, coordinateKeypadStyles } from "../../../components";
import { FILES, RANKS } from "@blindfold-chess/types";
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

/**
 * The step hint over the web's `ChessCoordinateKeypad`: the file row, the
 * rank row, then backspace and Clear. The hint keeps its line while it is
 * blank (during a verdict or the countdown), so the keys never move.
 */
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

  const hint = disabled
    ? ""
    : expectingFile
      ? t("diagonalQuiz.session.selectFile")
      : expectingRank
        ? t("diagonalQuiz.session.selectRank")
        : "";

  return (
    <View>
      <Text
        style={[
          coordinateKeypadStyles.stepIndicator,
          styles.hint,
          { color: colors.mutedForeground },
        ]}
      >
        {hint}
      </Text>

      <View style={styles.keypad}>
        {/* No `activeKey`: an entered file goes straight into the answer
            string above, so there is nothing half-entered to highlight. */}
        <CoordinateKeyRow
          keys={FILES}
          enabled={!disabled && expectingFile}
          onPress={onFilePress}
        />

        <CoordinateKeyRow
          keys={RANKS}
          enabled={!disabled && expectingRank}
          onPress={onRankPress}
        />

        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={onBackspace}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityLabel={t("diagonalQuiz.session.backspace")}
            style={[
              styles.actionButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                opacity: disabled ? 0.3 : 1,
              },
            ]}
          >
            <Delete size={20} color={colors.foreground} />
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
              style={[styles.actionButtonText, { color: colors.foreground }]}
            >
              {t("diagonalQuiz.session.clear")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The web's `text-sm mb-4 min-h-5`.
  hint: {
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  // The web's `flex flex-col gap-2`.
  keypad: {
    gap: spacing.sm,
  },
  // The web's `flex gap-2 mt-1`.
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  // The web's `h-11` keys, with the key rows' corners.
  actionButton: {
    flex: 1,
    height: touchTarget.minSize,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
});
