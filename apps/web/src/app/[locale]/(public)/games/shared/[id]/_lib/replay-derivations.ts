import { computeMoveNumber } from '@blindfold-chess/features/chess-core/move-numbering';
import type { Side } from '@blindfold-chess/types';

import { parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';
import { getPlayerMoveIndices } from '@/app/[locale]/(public)/games/play/_lib/move-ops-alignment';

/**
 * Pure derivations mapping the replay's navigation position (the
 * `useMoveNavigation` cursor: -2 = initial board, -1 = latest, >=0 = a
 * concrete move index) onto the values the review UI needs. Extracted from
 * GameReview so the ply/label/orientation math is unit-testable without
 * rendering.
 */

/**
 * Convert the `?color=white|black` request into the manual-toggle seed
 * `useBoardFlip` expects: `effectiveFlipped` means "black is at the bottom",
 * the default (no param) is the player's own side, and the hook inverts the
 * seed again for a black player.
 */
export function computeInitialFlipped(orientation: Side | undefined, playerColor: Side): boolean {
  if (!orientation) return false;
  const wantBlackAtBottom = orientation === 'black';
  return playerColor === 'black' ? !wantBlackAtBottom : wantBlackAtBottom;
}

/**
 * Map the board's navigation position to the ply the comment thread anchors
 * to: a concrete move (0-based), the last move when viewing the latest
 * position, or the whole game (null) at the start.
 */
export function computeCurrentPly(currentPosition: number, movesLength: number): number | null {
  if (currentPosition >= 0) return currentPosition;
  if (currentPosition === -1) return movesLength > 0 ? movesLength - 1 : null;
  return null;
}

/**
 * The ply the game plays FROM the displayed position — the move the viewer is
 * about to step into. Null at the latest position (-1), where nothing follows.
 *
 * The inverse of {@link computeCurrentPly}, and the anchor for anything that
 * belongs to a position rather than to a move already made: the engine's
 * preferred move here is a fact about THIS board, so it is drawn one step
 * earlier than the grade of the move that was actually played.
 */
export function computeNextPly(currentPosition: number, movesLength: number): number | null {
  if (currentPosition === -1) return null;
  const ply = currentPosition === -2 ? 0 : currentPosition + 1;
  return ply < movesLength ? ply : null;
}

/**
 * The half-move count to reach the displayed position (`appliedPlies`) and
 * the game's move played FROM that position (`continuationSan`) — seeded as
 * a puzzle's draft solution by CreateFromPositionMenu. `continuationSan` is
 * undefined at the latest position (no continuation) or for an empty game.
 */
export function computeContinuation(
  currentPosition: number,
  moves: readonly string[]
): { appliedPlies: number; continuationSan: string | undefined } {
  const appliedPlies =
    currentPosition >= 0 ? currentPosition + 1 : currentPosition === -2 ? 0 : moves.length;
  return {
    appliedPlies,
    continuationSan: appliedPlies < moves.length ? moves[appliedPlies] : undefined,
  };
}

/**
 * The single source of the PGN-style move-label format: white → "1. d4",
 * black → "1...d5". Every label in this route (the review heading, the
 * discussion-feed group headers, the comment move-reference preview) goes
 * through here so the notation cannot drift between surfaces.
 */
export function formatPlyLabel(
  ply: number,
  san: string,
  startsAsBlack: boolean,
  startMoveNumber: number
): string {
  const { moveNumber, isWhiteMove } = computeMoveNumber(ply, startsAsBlack, startMoveNumber);
  return isWhiteMove ? `${moveNumber}. ${san}` : `${moveNumber}...${san}`;
}

/**
 * Label a move with its PGN-style number prefix: white → "1. d4",
 * black → "1...d5" (derived from the starting FEN's side + fullmove).
 */
export function formatMoveLabel(
  currentPly: number | null,
  moves: readonly string[],
  startingFen: string | null
): string | null {
  if (currentPly == null) return null;
  const san = moves[currentPly];
  if (!san) return null;
  const { startsAsBlack, startMoveNumber } = parseFenMeta(startingFen);
  return formatPlyLabel(currentPly, san, startsAsBlack, startMoveNumber);
}

/**
 * One-line PGN-style rendering of the seeded setup prefix — "1. e4 e5 2. Nf3
 * Nc6 3. Bb5", or "3... d5 4. c4 e6" when a custom FEN starts as black. The
 * Summary's starting-position board captions itself with this so the reader
 * sees HOW the position was reached, not just what it looks like. Null when
 * there is no prefix (the board alone tells the story for FEN-only starts).
 */
export function formatSetupMovesLine(
  moves: readonly string[],
  setupPlies: number,
  startingFen: string | null
): string | null {
  const plies = Math.min(setupPlies, moves.length);
  if (plies <= 0) return null;
  const { startsAsBlack, startMoveNumber } = parseFenMeta(startingFen);
  const parts: string[] = [];
  for (let ply = 0; ply < plies; ply++) {
    const { moveNumber, isWhiteMove } = computeMoveNumber(ply, startsAsBlack, startMoveNumber);
    if (isWhiteMove) {
      parts.push(`${moveNumber}. ${moves[ply]}`);
    } else if (ply === 0) {
      parts.push(`${moveNumber}... ${moves[ply]}`);
    } else {
      parts.push(moves[ply]);
    }
  }
  return parts.join(' ');
}

/**
 * Indices into `moves` that were played by `playerColor`, skipping the seeded
 * setup prefix (those moves have no operation log). Delegates to the
 * canonical operation-log alignment rule in play/_lib/move-ops-alignment.
 */
export function computePlayerMoveIndices(
  movesLength: number,
  startingFen: string | undefined,
  playerColor: Side,
  setupPlies = 0
): number[] {
  return getPlayerMoveIndices(movesLength, startingFen, playerColor, setupPlies);
}
