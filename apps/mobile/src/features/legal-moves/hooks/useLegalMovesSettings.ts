import { useCallback } from "react";
import { useAsyncStorageSettings } from "../../../lib/persistent-settings/useAsyncStorageSettings";
import type { PieceType, LegalMovesSettings } from "../lib/types";
import { DEFAULT_LEGAL_MOVES_SETTINGS } from "../lib/types";

const STORAGE_KEY = "LEGAL_MOVES_SETTINGS";

export function useLegalMovesSettings() {
  const persisted = useAsyncStorageSettings<LegalMovesSettings>(
    STORAGE_KEY,
    DEFAULT_LEGAL_MOVES_SETTINGS,
  );
  const { settings, updateSettings } = persisted;

  const togglePiece = useCallback(
    (piece: PieceType) => {
      const isSelected = settings.selectedPieces.includes(piece);
      let newPieces: PieceType[];

      if (isSelected) {
        if (settings.selectedPieces.length <= 1) return;
        newPieces = settings.selectedPieces.filter((p) => p !== piece);
      } else {
        newPieces = [...settings.selectedPieces, piece];
      }

      updateSettings({ selectedPieces: newPieces });
    },
    [settings.selectedPieces, updateSettings],
  );

  return { ...persisted, togglePiece };
}
