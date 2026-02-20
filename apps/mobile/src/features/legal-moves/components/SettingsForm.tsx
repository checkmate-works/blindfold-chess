import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from "../../../theme";
import type { PieceType } from "../lib/types";
import { PIECE_TYPES, pieceDisplayMap } from "../lib/types";

type SettingsFormProps = {
  timeLimit: number;
  selectedPieces: PieceType[];
  onUpdateTimeLimit: (timeLimit: number) => void;
  onTogglePiece: (piece: PieceType) => void;
};

const DURATION_OPTIONS = [30, 60, 90, 120];

export function SettingsForm({
  timeLimit,
  selectedPieces,
  onUpdateTimeLimit,
  onTogglePiece,
}: SettingsFormProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Duration */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.foreground }]}>
          {t("legalMoves.setup.timeLimit")}
        </Text>
        <View style={styles.optionsRow}>
          {DURATION_OPTIONS.map((d) => (
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
                {t("legalMoves.setup.durationSeconds", { seconds: d })}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Piece Selection */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.foreground }]}>
          {t("legalMoves.setup.pieceSelection")}
        </Text>
        <View style={styles.optionsRow}>
          {PIECE_TYPES.map((piece) => {
            const isSelected = selectedPieces.includes(piece);
            return (
              <TouchableOpacity
                key={piece}
                onPress={() => onTogglePiece(piece)}
                style={[
                  styles.pieceButton,
                  {
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected ? colors.primary : colors.card,
                  },
                ]}
              >
                <Text style={styles.pieceIcon}>{pieceDisplayMap[piece]}</Text>
                <Text
                  style={[
                    styles.pieceLabel,
                    {
                      color: isSelected
                        ? colors.primaryForeground
                        : colors.foreground,
                    },
                  ]}
                >
                  {t(`legalMoves.pieces.${piece}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
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
  pieceButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 56,
  },
  pieceIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  pieceLabel: {
    fontSize: fontSize.xs,
  },
});
