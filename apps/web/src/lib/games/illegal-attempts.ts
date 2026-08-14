import type { Side } from '@blindfold-chess/types';

import type { MoveOperationLog } from './saved-game-types';

/**
 * Where a rejected move was aimed. Either square may be missing: some attempt
 * texts name only a destination (see {@link parseAttemptSquares}).
 */
export type IllegalAttemptSquares = { from?: string; to?: string };

/** A generic move ending in a destination square, with an optional promotion suffix. */
const TRAILING_SQUARE_RE = /([a-h][1-8])(?:=[QRBNqrbn])?$/;

/**
 * Recovers `from`/`to` squares from one rejected-move attempt text, so a
 * rejected move can be marked on its actual squares rather than shown as an
 * unlabeled red flash. Two very different sources feed `invalidAttempts` (see
 * {@link MoveOperationLog.invalidAttempts}): board drag/click attempts, which
 * synthesize a SAN-like label via `describeIllegalAttempt`, and raw text-input
 * submissions, which can be anything a user typed — so this is written
 * defensively and returns null (no frame, silently skipped) for anything that
 * doesn't match a recognized shape, rather than guessing.
 *
 * Checked in order, first match wins:
 * 1. Coordinate long form (`e2-e4`) — the only shape with both squares known.
 * 2. Castling (`O-O` / `O-O-O`, letter-O or digit-0) — squares derived from
 *    `playerColor` since the notation names no square directly.
 * 3. Pawn capture (`exd5`) — only the destination is recoverable; the file
 *    letter names a file, not a departure square.
 * 4. Any other move ending in a square, with or without a promotion suffix
 *    (`Nf3`, `Qxh5+` already stripped to `Qxh5`, `e8=Q`) — destination only.
 *
 * Trailing check/checkmate marks (`+`/`#`) are stripped before matching, since
 * they carry no square information and would otherwise break the end anchor.
 */
export function parseAttemptSquares(
  attempt: string,
  playerColor: Side
): IllegalAttemptSquares | null {
  const stripped = attempt.replace(/[+#]+$/, '');

  const coordinateLong = stripped.match(/^([a-h][1-8])-([a-h][1-8])$/);
  if (coordinateLong) return { from: coordinateLong[1], to: coordinateLong[2] };

  if (/^[O0]-[O0](-[O0])?$/i.test(stripped)) {
    const homeRank = playerColor === 'white' ? '1' : '8';
    const isLongCastle = stripped.split('-').length === 3;
    return { from: `e${homeRank}`, to: `${isLongCastle ? 'c' : 'g'}${homeRank}` };
  }

  const pawnCapture = stripped.match(/^([a-h])x([a-h][1-8])$/);
  if (pawnCapture) return { to: pawnCapture[2] };

  const trailingSquare = stripped.match(TRAILING_SQUARE_RE);
  if (trailingSquare) return { to: trailingSquare[1] };

  return null;
}

/**
 * Where the move at `attemptIndex` of a log's {@link MoveOperationLog.invalidAttempts}
 * was aimed, or null when that cannot be told.
 *
 * The single answer to "which squares does this rejected attempt mark", shared
 * by every surface that draws one — the "as played" GIF and the replay board's
 * tap-a-chip highlight — so the two can never disagree about where a given
 * attempt pointed.
 *
 * Prefers the squares recorded at the moment of rejection
 * ({@link MoveOperationLog.invalidAttemptSquares}, board attempts only, exact)
 * and falls back to re-parsing the display text, which is all a MoveInputPanel
 * attempt or a pre-2026-07 record leaves behind. Callers should treat null as
 * "not markable" — draw nothing, and do not offer the interaction at all
 * rather than offering one that does nothing.
 */
export function resolveIllegalAttemptSquares(
  log: MoveOperationLog,
  attemptIndex: number,
  playerColor: Side
): IllegalAttemptSquares | null {
  const recorded = log.invalidAttemptSquares?.[attemptIndex];
  if (recorded) return recorded;

  const text = log.invalidAttempts?.[attemptIndex];
  return text ? parseAttemptSquares(text, playerColor) : null;
}
