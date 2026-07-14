import { useCallback } from "react";
import { toggleSelection } from "@blindfold-chess/features/common";
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
      const newPieces = toggleSelection(settings.selectedPieces, piece);
      if (newPieces === settings.selectedPieces) return;
      updateSettings({ selectedPieces: newPieces });
    },
    [settings.selectedPieces, updateSettings],
  );

  return { ...persisted, togglePiece };
}
