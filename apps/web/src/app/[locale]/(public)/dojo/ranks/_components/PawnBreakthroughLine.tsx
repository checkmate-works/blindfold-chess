'use client';

import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { BREAKTHROUGH_LINE, PAWN_BREAKTHROUGH_FEN } from '@blindfold-chess/features/dojo-guides';

import { GameCommentBody } from '@/app/[locale]/(public)/games/shared/[id]/_components/GameCommentBody';

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
