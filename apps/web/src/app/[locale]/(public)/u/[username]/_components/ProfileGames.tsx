import { getStartingFen } from '@blindfold-chess/features/chess-core';

import type { SharedGameListItem } from '@/lib/db/games-read';
import type { LikeMeta } from '@/lib/db/like-queries';
import type { ReplyMeta } from '@/lib/db/reply-meta-queries';

import { toggleGameLikeAction } from '@/app/[locale]/(public)/games/shared/[id]/_actions/game-like';
import { GameColorOpeningRow } from '@/app/[locale]/(public)/games/shared/_components/GameColorOpeningRow';
import { CatalogListCard } from '@/app/[locale]/_components/CatalogListCard';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  games: SharedGameListItem[];
  likeMetaMap: Map<string, LikeMeta>;
  replyMetaMap: Map<string, ReplyMeta>;
  emptyReplyMeta: ReplyMeta;
  currentPage: number;
  totalPages: number;
  locale: Locale;
  buildHref: (page: number) => string;
  justNowLabel: string;
  colorLabels: {
    white: string;
    black: string;
  };
  /** Resolves an opening's localized display name from its slug + English fallback. */
  resolveOpeningName: (slug: string, fallbackName: string) => string;
  labels: {
    noGames: string;
  };
};

const EMPTY_LIKE_META: LikeMeta = { likeCount: 0, likedByMe: false };

/**
 * Games tab on a public profile — lists a user's publicly-shared games using the
 * same {@link CatalogListCard} the shared-games gallery uses, with the player's
 * colour + detected opening on the meta row. Presentational: the caller resolves
 * the localized colour / opening / relative-time labels and passes them in.
 */
export function ProfileGames({
  games,
  likeMetaMap,
  replyMetaMap,
  emptyReplyMeta,
  currentPage,
  totalPages,
  locale,
  buildHref,
  justNowLabel,
  colorLabels,
  resolveOpeningName,
  labels,
}: Props) {
  return (
    <div>
      <div className="mt-4 space-y-3">
        {games.length > 0 ? (
          games.map((g) => (
            <CatalogListCard
              key={g.id}
              id={g.id}
              fen={g.startingFen ?? getStartingFen()}
              title={g.title}
              description={g.description}
              createdAt={g.createdAt}
              profile={g.author}
              likeMeta={likeMetaMap.get(g.id) ?? EMPTY_LIKE_META}
              replyMeta={replyMetaMap.get(g.id) ?? emptyReplyMeta}
              detailHref={`/games/shared/${g.id}`}
              i18nNamespace="sharedGames.detail"
              toggleLikeAction={toggleGameLikeAction}
              justNowLabel={justNowLabel}
              locale={locale}
              topicKey=""
              meta={
                <GameColorOpeningRow
                  playerColor={g.playerColor}
                  colorLabel={g.playerColor === 'white' ? colorLabels.white : colorLabels.black}
                  opening={g.opening}
                  openingDisplayName={
                    g.opening ? resolveOpeningName(g.opening.slug, g.opening.name) : undefined
                  }
                  locale={locale}
                />
              }
            />
          ))
        ) : (
          <p className="py-8 text-center text-muted-foreground">{labels.noGames}</p>
        )}
      </div>

      <PaginationNav
        locale={locale}
        currentPage={currentPage}
        totalPages={totalPages}
        buildHref={buildHref}
      />
    </div>
  );
}
