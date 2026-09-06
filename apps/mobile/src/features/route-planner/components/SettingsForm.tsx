import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { OptionsField, PieceSelectionField } from "../../../components";
import { spacing } from "../../../theme";
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

  return (
    <View style={styles.container}>
      <OptionsField
        label={t("routePlanner.setup.problemCount")}
        options={PROBLEM_COUNT_OPTIONS}
        value={problemCount}
        onChange={onUpdateProblemCount}
        formatOption={(count) => t("routePlanner.setup.problemUnit", { count })}
      />

      <PieceSelectionField
        label={t("routePlanner.setup.pieceSelection")}
        pieces={ROUTE_PLANNER_PIECES}
        displayMap={PIECE_DISPLAY_MAP}
        selected={selectedPieces}
        labelFor={(piece) => t(`routePlanner.pieces.${piece}`)}
        onToggle={onTogglePiece}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
});
