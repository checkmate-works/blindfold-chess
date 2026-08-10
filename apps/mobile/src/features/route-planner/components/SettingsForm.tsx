import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { OptionsField, SelectableChip } from "../../../components";
import { useTheme, fontSize, fontWeight, spacing } from "../../../theme";
import type { RoutePlannerPieceType } from "../lib/types";
import { ROUTE_PLANNER_PIECES, PIECE_DISPLAY_MAP } from "../lib/types";

type SettingsFormProps = {
  problemCount: number;
  selectedPieces: RoutePlannerPieceType[];
  onUpdateProblemCount: (count: number) => void;
  onTogglePiece: (piece: RoutePlannerPieceType) => void;
};

const PROBLEM_COUNT_OPTIONS = [3, 5, 10, 15];

export function SettingsForm({
  problemCount,
  selectedPieces,
  onUpdateProblemCount,
  onTogglePiece,
}: SettingsFormProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <OptionsField
        label={t("routePlanner.setup.problemCount")}
        options={PROBLEM_COUNT_OPTIONS}
        value={problemCount}
        onChange={onUpdateProblemCount}
        formatOption={(count) => t("routePlanner.setup.problemUnit", { count })}
      />

      {/* Not an `OptionsField`: pieces are a multi-select, so every chip
          carries its own selected state rather than one value winning. */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.foreground }]}>
          {t("routePlanner.setup.pieceSelection")}
        </Text>
        <View style={styles.optionsRow}>
          {ROUTE_PLANNER_PIECES.map((piece) => (
            <SelectableChip
              key={piece}
              icon={PIECE_DISPLAY_MAP[piece]}
              label={t(`routePlanner.pieces.${piece}`)}
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
