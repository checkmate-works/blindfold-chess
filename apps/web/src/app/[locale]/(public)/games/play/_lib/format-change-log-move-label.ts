import { computeMoveNumber } from '@/app/[locale]/(public)/practice/(free-play)/recall/_lib/compute-move-number';

import { parseFenMeta } from './fen-utils';

/**
 * Format a settings change-log's `atMoveIndex` (half-moves already played
 * when the change was recorded — see {@link PlaySettingsChangeEntry} /
 * {@link PreferenceChangeLogEntry}) as a PGN-style move-number anchor
 * ("26." / "26..."), matching the "N." / "N..." convention used for move
 * references elsewhere (`comment-move-references.ts`, `replay-derivations.ts`).
 *
 * `atMoveIndex` is a count, not a 0-based ply index, so the anchor refers to
 * the move at `atMoveIndex - 1`. `atMoveIndex <= 0` means the change was
 * recorded before the first move was played — there is no move to anchor to,
 * so this returns null and callers should fall back to a "before move 1" /
 * start label.
 */
export function formatChangeLogMoveLabel(
  atMoveIndex: number,
  startingFen: string | null | undefined
): string | null {
  if (atMoveIndex <= 0) return null;
  const { startsAsBlack, startMoveNumber } = parseFenMeta(startingFen);
  const { moveNumber, isWhiteMove } = computeMoveNumber(
    atMoveIndex - 1,
    startsAsBlack,
    startMoveNumber
  );
  return isWhiteMove ? `${moveNumber}.` : `${moveNumber}...`;
}
