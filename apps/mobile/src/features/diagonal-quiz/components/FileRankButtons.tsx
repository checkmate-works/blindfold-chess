import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { Delete } from "lucide-react-native";
import { CoordinateInput, coordinateKeypadStyles } from "../../../components";
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
 * The step hint over the web's `ChessCoordinateKeypad`: the shared file and
 * rank pad, then backspace and Clear. The hint keeps its line while it is
 * blank (during a verdict or the countdown), so the keys never move.
 *
 * The pad is switched off key by key (`disabledFile` / `disabledRank`), not
 * with its whole-pad lock: the answer is typed a file, then a rank, so the
 * row that is not wanted yet has to look off while the other stays at full
 * strength, and while the whole surface is locked every key takes the same
 * faded look as the backspace and Clear buttons beside them.
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
        {/* No `selectedFile` / `selectedRank`: an entered file goes straight
            into the answer string above, so there is nothing half-entered
            to highlight. */}
        <CoordinateInput
          onFilePress={onFilePress}
          onRankPress={onRankPress}
          disabledFile={() => disabled || !expectingFile}
          disabledRank={() => disabled || !expectingRank}
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
