import { useCallback, useMemo, useState } from "react";
import {
  type AiGameStart,
  type FenStartErrorKey,
  type PgnStartErrorKey,
  deriveSideFromPgn,
  resolveFenStart,
  resolvePgnStart,
} from "@blindfold-chess/features/ai-game";
import { parseFenFields } from "@blindfold-chess/features/chess-core/fen-fields";
import type { PieceColor, Side } from "@blindfold-chess/types";
import type { Result } from "@blindfold-chess/features/utils";

/** How the AI game begins: the standard position, a typed FEN, or a pasted PGN. */
export type AiGameStartMode = "standard" | "position" | "pgn";

export const AI_GAME_START_MODES: readonly AiGameStartMode[] = [
  "standard",
  "position",
  "pgn",
];

export type StartResolution = Result<
  AiGameStart,
  FenStartErrorKey | PgnStartErrorKey
>;

type Options = {
  /** Called when a pasted PGN implies the colour the player should take. */
  onDerivePlayerColor: (color: Side) => void;
};

/**
 * Setup-screen state for the start of an AI game. Kept in memory rather than
 * in the persisted AI-game settings: a FEN or PGN is pasted for one game, and
 * reopening the setup screen should not resurrect it.
 *
 * Two pieces of state follow the text the player types, set in the change
 * handlers rather than in effects so the form never renders a stale value:
 *
 * - The side to move follows the FEN's own side-to-move field whenever the
 *   typed text has one, and stays on its last value otherwise; the player can
 *   still flip it afterwards.
 * - The player's colour follows the PGN (the side to move after its last
 *   move) until the player picks a colour themselves while in PGN mode, which
 *   is the web PGN form's rule.
 */
export function useStartPositionInput({ onDerivePlayerColor }: Options) {
  const [mode, setMode] = useState<AiGameStartMode>("standard");
  const [fenText, setFenText] = useState("");
  const [sideToMove, setSideToMove] = useState<PieceColor>("w");
  const [pgnText, setPgnText] = useState("");
  const [colorManuallySet, setColorManuallySet] = useState(false);

  const changeFenText = useCallback((text: string) => {
    setFenText(text);
    const side = parseFenFields(text)?.sideToMove;
    if (side) setSideToMove(side);
  }, []);

  const changePgnText = useCallback(
    (text: string) => {
      setPgnText(text);
      if (colorManuallySet) return;
      const derived = deriveSideFromPgn(text);
      if (derived) onDerivePlayerColor(derived);
    },
    [colorManuallySet, onDerivePlayerColor],
  );

  /** Records that the player chose a colour, which stops PGN auto-selection. */
  const markColorManuallySet = useCallback(() => {
    if (mode === "pgn") setColorManuallySet(true);
  }, [mode]);

  const resolution = useMemo((): StartResolution => {
    switch (mode) {
      case "standard":
        return { ok: true, value: { moves: [] } };
      case "position":
        return resolveFenStart(fenText, sideToMove);
      case "pgn":
        return resolvePgnStart(pgnText);
    }
  }, [mode, fenText, sideToMove, pgnText]);

  const showDerivedFromPgnHint = useMemo(
    () =>
      mode === "pgn" &&
      !colorManuallySet &&
      deriveSideFromPgn(pgnText) !== null,
    [mode, colorManuallySet, pgnText],
  );

  return {
    mode,
    setMode,
    fenText,
    changeFenText,
    sideToMove,
    setSideToMove,
    pgnText,
    changePgnText,
    markColorManuallySet,
    resolution,
    showDerivedFromPgnHint,
  };
}
