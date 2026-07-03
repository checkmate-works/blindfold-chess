import { parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';
import { getPlayerMoveIndices } from '@/app/[locale]/(public)/games/play/_lib/move-ops-alignment';
import { computeMoveNumber } from '@/app/[locale]/(public)/practice/(free-play)/recall/_lib/compute-move-number';

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
export function computeInitialFlipped(
  orientation: 'white' | 'black' | undefined,
  playerColor: 'white' | 'black'
): boolean {
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
  const { moveNumber, isWhiteMove } = computeMoveNumber(currentPly, startsAsBlack, startMoveNumber);
  return isWhiteMove ? `${moveNumber}. ${san}` : `${moveNumber}...${san}`;
}

/**
 * Indices into `moves` that were played by `playerColor`. Delegates to the
 * canonical operation-log alignment rule in play/_lib/move-ops-alignment.
 */
export function computePlayerMoveIndices(
  movesLength: number,
  startingFen: string | undefined,
  playerColor: 'white' | 'black'
): number[] {
  return getPlayerMoveIndices(movesLength, startingFen, playerColor);
}
