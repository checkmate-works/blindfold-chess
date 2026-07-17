'use client';

import { useLocale } from 'next-intl';

import { GameCommentBody } from '@/app/[locale]/(public)/games/shared/[id]/_components/GameCommentBody';

import { PAWN_BREAKTHROUGH_FEN } from './pawn-breakthrough-fen';

/**
 * The forced winning line from {@link PAWN_BREAKTHROUGH_FEN}. Exported so a
 * test can pin every ply as legal from that position — the move-reference
 * parser truncates silently at the first illegal move.
 */
export const BREAKTHROUGH_LINE = '1. b6 axb6 2. c6 bxc6 3. a6 Kf7 4. a7 b5 5. a8=Q';

/**
 * The 1kyu guide's steppable replay of {@link BREAKTHROUGH_LINE}. Reuses the
 * same move-reference affordance as game comments: the run renders as a button
 * that opens a steppable board preview, so a reader can walk the breakthrough
 * instead of visualising nine plies unaided.
 *
 * `moves={[]}` is what anchors the replay to the guide's position rather than a
 * game: with no game moves to branch off, `startingFen` becomes the base
 * position the `1.` anchor resolves against. That keeps this decoupled from the
 * DB — no game row, no auth. The board theme comes from `GamePreferencesProvider`,
 * which `guides/layout.tsx` and `ranks/layout.tsx` both mount.
 *
 * The locale comes from `useLocale()` rather than a prop because
 * `paragraphVisualAids` instantiates its entries at module scope, where no
 * per-request locale exists.
 */
export function PawnBreakthroughLine() {
  const locale = useLocale();

  return (
    <GameCommentBody
      text={BREAKTHROUGH_LINE}
      locale={locale}
      moves={[]}
      startingFen={PAWN_BREAKTHROUGH_FEN}
      playerColor="white"
    />
  );
}
