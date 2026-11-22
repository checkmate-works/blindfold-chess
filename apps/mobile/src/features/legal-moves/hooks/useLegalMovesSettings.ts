import type { LegalMovesPieceSelection } from "@blindfold-chess/features/legal-moves";

import { useAsyncStorageSettings } from "../../../lib/persistent-settings/useAsyncStorageSettings";

/**
 * The legal-moves setup: which piece the challenge and training drill — one
 * piece, or `random` for all five mixed (the web's challenge setup). The
 * selection is also the leaderboard key. Stored under a new key: the former
 * multi-piece selection and time limit have no counterpart in the
 * challenge rules.
 */
export type LegalMovesSetup = { selectedPiece: LegalMovesPieceSelection };

const DEFAULTS: LegalMovesSetup = { selectedPiece: "random" };

export function useLegalMovesSettings() {
  return useAsyncStorageSettings<LegalMovesSetup>(
    "LEGAL_MOVES_CHALLENGE_SETTINGS",
    DEFAULTS,
  );
}
