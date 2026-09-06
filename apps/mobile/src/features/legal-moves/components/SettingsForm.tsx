import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import {
  OptionsField,
  PieceSelectionField,
  TIME_LIMIT_OPTIONS,
} from "../../../components";
import { spacing } from "../../../theme";
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

      <PieceSelectionField
        label={t("legalMoves.setup.pieceSelection")}
        pieces={PIECE_TYPES}
        displayMap={pieceDisplayMap}
        selected={selectedPieces}
        labelFor={(piece) => t(`legalMoves.pieces.${piece}`)}
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
