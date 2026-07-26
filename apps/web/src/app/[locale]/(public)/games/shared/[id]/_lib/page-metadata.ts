import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getGameById } from '@/lib/db/games-read';
import type { GameRecord } from '@/lib/db/schema';
import { formatEngineConfigLabel } from '@/lib/engines/format-label';
import { UUID_RE } from '@/lib/validations/uuid';

import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * The side that won a game, from its author-perspective `result` +
 * `playerColor` — `null` for a draw. Mirrors `GameOutcomeLabel`'s winner
 * derivation (the shared game review's neutral "White won" / "Black won"
 * label); kept here too since the OG card and its meta description need the
 * same fact and neither renders `GameOutcomeLabel` (a client component).
 */
function resolveWinnerSide(
  game: Pick<GameRecord, 'result' | 'playerColor'>
): 'white' | 'black' | null {
  if (game.result === 'draw') return null;
  if (game.result === 'win') return game.playerColor;
  return game.playerColor === 'white' ? 'black' : 'white';
}

/**
 * One-line game summary ("vs Maia 1500 · 42 moves · White won") used as both
 * the shared-game meta `description` and the OG image's right-panel summary
 * text — kept in one place so the two surfaces never drift apart.
 */
export async function buildGameOgDescription({
  locale,
  game,
}: {
  locale: Locale;
  game: GameRecord;
}): Promise<string> {
  const [t, tEngineLevel] = await Promise.all([
    getTranslations({ locale, namespace: 'sharedGames' }),
    // Same namespace `formatEngineConfigLabel`'s other call sites use for the
    // Stockfish "level" word (see `GameListItemBase.tsx` / `VsAiCard.tsx`).
    getTranslations({ locale, namespace: 'home.gameList' }),
  ]);

  const engine = formatEngineConfigLabel(game.engineConfig, tEngineLevel);
  const winner = resolveWinnerSide(game);
  const result =
    winner === 'white'
      ? t('result.whiteWon')
      : winner === 'black'
        ? t('result.blackWon')
        : t('result.draw');

  return t('detail.ogDescription', { engine, moves: game.moveCount, result });
}

/**
 * Metadata for the shared-game detail. The canonical points at the bare
 * permalink so the `?color=` orientation and `#move` URL variants de-duplicate
 * to one URL.
 *
 * The card image is NOT set here, and must not be. Next.js merges metadata
 * per top-level key, not deeply: the `openGraph` object `generateCanonicalMetadata`
 * emits (url / title / description, no images) replaces the root layout's
 * `openGraph` wholesale — its `logo.png` images included. Before the board
 * card existed, that left every shared-game link with no image at all. The
 * fix for that is not an `images` key here but the file-convention
 * `opengraph-image.tsx` / `twitter-image.tsx` siblings, which Next resolves
 * independently of this object.
 */
export async function buildSharedGameMetadata({
  locale,
  id,
}: {
  locale: Locale;
  id: string;
}): Promise<Metadata> {
  const detail = UUID_RE.test(id) ? await getGameById(id) : null;
  const title =
    detail?.game.title ??
    (await getTranslations({ locale, namespace: 'sharedGames' }))('detail.fallbackTitle');
  const description = detail
    ? await buildGameOgDescription({ locale, game: detail.game })
    : undefined;

  return {
    ...generateCanonicalMetadata({ locale, path: `games/shared/${id}`, title, description }),
    title: resolveTitle(title, locale),
    ...(description && {
      description,
      // The file-convention `twitter-image.tsx` supplies `twitter.images` —
      // only the copy needs overriding here, so the root layout's
      // `logo.png` twitter image is never referenced for this page.
      twitter: { card: 'summary_large_image', title, description },
    }),
  };
}
