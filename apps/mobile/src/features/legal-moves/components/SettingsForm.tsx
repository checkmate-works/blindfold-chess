import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  LEGAL_MOVES_PIECE_SELECTIONS,
  type LegalMovesPieceSelection,
} from "@blindfold-chess/features/legal-moves";
import type { PieceType } from "@blindfold-chess/types";

import { ListSection, PieceSelector } from "../../../components";
import { spacing } from "../../../theme";

const PIECE_OF: Record<LegalMovesPieceSelection, PieceType | null> = {
  king: "k",
  queen: "q",
  rook: "r",
  bishop: "b",
  knight: "n",
  random: null,
};

type SettingsFormProps = {
  selectedPiece: LegalMovesPieceSelection;
  onChange: (selectedPiece: LegalMovesPieceSelection) => void;
};

/**
 * The setup screen's "Game Settings" panel: the piece to drill, one of five
 * or all mixed, as the web's piece buttons.
 */
export function SettingsForm({ selectedPiece, onChange }: SettingsFormProps) {
  const { t } = useTranslation();
  return (
    <ListSection title={t("common.gameSettings")}>
      <View style={styles.body}>
        <PieceSelector
          label={t("legalMoves.setup.pieceSelection")}
          options={LEGAL_MOVES_PIECE_SELECTIONS}
          value={selectedPiece}
          onChange={onChange}
          pieceOf={(piece) => PIECE_OF[piece]}
          // records.keys.{king,queen,rook,bishop,knight,random}
          formatOption={(piece) => t(`records.keys.${piece}`)}
        />
      </View>
    </ListSection>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.md,
  },
});
