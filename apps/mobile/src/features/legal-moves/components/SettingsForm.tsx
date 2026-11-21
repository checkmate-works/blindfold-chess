import { useTranslation } from "react-i18next";
import {
  LEGAL_MOVES_PIECE_SELECTIONS,
  type LegalMovesPieceSelection,
} from "@blindfold-chess/features/legal-moves";

import { OptionsField } from "../../../components";

type SettingsFormProps = {
  selectedPiece: LegalMovesPieceSelection;
  onChange: (selectedPiece: LegalMovesPieceSelection) => void;
};

/** The piece to drill: one of five, or all mixed. */
export function SettingsForm({ selectedPiece, onChange }: SettingsFormProps) {
  const { t } = useTranslation();
  // records.keys.{king,queen,rook,bishop,knight,random}
  return (
    <OptionsField
      label={t("legalMoves.setup.pieceSelection")}
      options={LEGAL_MOVES_PIECE_SELECTIONS}
      value={selectedPiece}
      onChange={onChange}
      formatOption={(piece) => t(`records.keys.${piece}`)}
    />
  );
}
