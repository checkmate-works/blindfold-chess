'use client';

import type { PieceSelection } from '@/app/_components/practice/PieceSelector';

import { useLocalStorageSettings } from '@/lib/persistent-settings/use-local-storage-settings';

export type LegalMovesSettings = {
  pieceSelection: PieceSelection;
};

const STORAGE_KEY = 'legalMoves_settings';

const DEFAULTS: LegalMovesSettings = {
  pieceSelection: 'random',
};

/**
 * The piece the player drills, shared by every screen that can change it —
 * the module top and the challenge setup.
 *
 * The setting deliberately does not live in the URL. A query parameter is
 * written only by the screen that starts a session, so every navigation that
 * does not rebuild it reverts the choice to `random` without saying so:
 * quitting a session lands back on `legal-moves/challenge` with a bare URL,
 * and the setup screen there used to seed its state from that missing
 * parameter. Storage survives those hops, so the setup screens read it and
 * the query keeps the one job it can do honestly — carrying the piece into a
 * session that is already starting.
 */
export function useLegalMovesSettings() {
  return useLocalStorageSettings(STORAGE_KEY, DEFAULTS);
}
