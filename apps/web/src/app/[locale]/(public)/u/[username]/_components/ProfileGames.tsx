import type { SharedGameListItem } from '@/lib/db/games-read';
import type { LikeMeta } from '@/lib/db/like-queries';
import type { ReplyMeta } from '@/lib/db/reply-meta-queries';

import { SharedGameListCard } from '@/app/[locale]/(public)/games/shared/_components/SharedGameListCard';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  games: SharedGameListItem[];
  likeMetaMap: Map<string, LikeMeta>;
  replyMetaMap: Map<string, ReplyMeta>;
  emptyReplyMeta: ReplyMeta;
  /** Ids of the listed games that already have an AI review. */
  reviewedGameIds: ReadonlySet<string>;
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
    aiReviewedBadge: string;
  };
};

/**
 * Games tab on a public profile — lists a user's publicly-shared games using the
 * same {@link SharedGameListCard} the shared-games gallery uses, with the player's
 * colour + detected opening on the meta row. Presentational: the caller resolves
 * the localized colour / opening / relative-time labels and passes them in.
 */
export function ProfileGames({
  games,
  likeMetaMap,
  replyMetaMap,
  emptyReplyMeta,
  reviewedGameIds,
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
            <SharedGameListCard
              key={g.id}
              game={g}
              likeMeta={likeMetaMap.get(g.id)}
              replyMeta={replyMetaMap.get(g.id) ?? emptyReplyMeta}
              reviewed={reviewedGameIds.has(g.id)}
              aiReviewedBadgeLabel={labels.aiReviewedBadge}
              colorLabels={colorLabels}
              resolveOpeningName={resolveOpeningName}
              justNowLabel={justNowLabel}
              locale={locale}
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
