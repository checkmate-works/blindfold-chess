import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';
import { FaChessKing } from 'react-icons/fa';

import type { ChunkGameItem } from '@/lib/db/game-chunks';

import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  games: ChunkGameItem[];
  locale: Locale;
};

/**
 * Compact "this chunk is used in these games" list for the chunk detail page —
 * the reverse of linking a chunk to a game move. One row per `(game, ply)`; the
 * title links straight to that move on the shared game's replay
 * (`/games/shared/<id>#<ply + 1>`, the half-move hash the replay reads). Kept
 * deliberately light (no board thumbnail / like / comment chrome) so it fits
 * the tabbed panel that shares space with the comments thread.
 */
export async function RelatedGamesList({ games, locale }: Props) {
  const [t, tResult, tPlay] = await Promise.all([
    getTranslations({ locale, namespace: 'topics.chunks.relatedGames' }),
    getTranslations({ locale, namespace: 'sharedGames.result' }),
    getTranslations({ locale, namespace: 'play.playerColor' }),
  ]);

  if (games.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('empty')}</p>;
  }

  return (
    <ul className="space-y-3">
      {games.map((g) => {
        const colorLabel = g.playerColor === 'white' ? tPlay('white') : tPlay('black');
        return (
          <li
            key={`${g.gameId}-${g.ply}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border p-3"
          >
            <span
              className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                g.playerColor === 'white'
                  ? 'border-border bg-white text-neutral-900'
                  : 'border-neutral-700 bg-neutral-900 text-white'
              }`}
              title={colorLabel}
            >
              <FaChessKing className="h-3 w-3" aria-hidden />
            </span>

            <Link
              href={`/games/shared/${g.gameId}#${g.ply + 1}`}
              locale={locale}
              className="min-w-0 flex-1 truncate font-medium text-foreground hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              {g.title}
            </Link>

            <span className="inline-block shrink-0 rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              {t('moveLabel', { n: g.ply + 1 })}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{tResult(g.result)}</span>

            {g.author && (
              <UserAvatar
                layout="inline"
                size="xs"
                profileHref={`/u/${g.author.username}`}
                avatarUrl={g.author.avatarUrl}
                displayName={g.author.displayName ?? g.author.username}
                locale={locale}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
