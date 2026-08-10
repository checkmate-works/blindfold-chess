import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import {
  OptionsField,
  SelectableChip,
  TIME_LIMIT_OPTIONS,
} from "../../../components";
import { useTheme, fontSize, fontWeight, spacing } from "../../../theme";
import type { PieceType } from "../lib/types";
import { PIECE_TYPES, pieceDisplayMap } from "../lib/types";

type SettingsFormProps = {
  timeLimit: number;
  selectedPieces: PieceType[];
  onUpdateTimeLimit: (timeLimit: number) => void;
  onTogglePiece: (piece: PieceType) => void;
};

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
      <OptionsField
        label={t("legalMoves.setup.timeLimit")}
        options={TIME_LIMIT_OPTIONS}
        value={timeLimit}
        onChange={onUpdateTimeLimit}
        formatOption={(seconds) =>
          t("legalMoves.setup.durationSeconds", { seconds })
        }
      />

      {/* Not an `OptionsField`: pieces are a multi-select, so every chip
          carries its own selected state rather than one value winning. */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.foreground }]}>
          {t("legalMoves.setup.pieceSelection")}
        </Text>
        <View style={styles.optionsRow}>
          {PIECE_TYPES.map((piece) => (
            <SelectableChip
              key={piece}
              icon={pieceDisplayMap[piece]}
              label={t(`legalMoves.pieces.${piece}`)}
              selected={selectedPieces.includes(piece)}
              onPress={() => onTogglePiece(piece)}
            />
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
});
