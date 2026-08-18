import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { FaPlus } from 'react-icons/fa';

import type { ChunkLinkedGame } from '@/lib/db/games-read';
import type { LikeMeta } from '@/lib/db/like-queries';
import type { ReplyMeta } from '@/lib/db/reply-meta-queries';

import { SharedGameListCard } from '@/app/[locale]/(public)/games/shared/_components/SharedGameListCard';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  games: ChunkLinkedGame[];
  likeMetaMap: Map<string, LikeMeta>;
  replyMetaMap: Map<string, ReplyMeta>;
  emptyReplyMeta: ReplyMeta;
  /** Ids of the listed games that already have an AI review. */
  reviewedGameIds: ReadonlySet<string>;
  locale: Locale;
  justNowLabel: string;
  colorLabels: { white: string; black: string };
  /** Resolves an opening's localized display name from its slug + English fallback. */
  resolveOpeningName: (slug: string, fallbackName: string) => string;
  emptyLabel: string;
  /** Resolved `sharedGames.list.aiReviewedBadge`. */
  aiReviewedBadgeLabel: string;
  /** Builds the "Move {n}" chip label for a 1-based move number. */
  moveLabel: (moveNumber: number) => string;
  /** Label for the "Start New Game" CTA shown alongside the empty state. */
  newGameLabel: string;
};

/**
 * "Games that use this chunk" list — the reverse of linking a chunk to a game
 * move. Renders the same {@link SharedGameListCard} the shared-games gallery
 * and the public profile's games tab use, so the card reads identically
 * everywhere. The one
 * chunk-specific addition is a row of move chips under the opening row, each a
 * deep link to the position where the chunk is tagged
 * (`/games/shared/<id>#<ply + 1>`, the half-move hash the replay reads).
 * Presentational: the caller resolves all localized labels and passes them in.
 */
export function RelatedGamesList({
  games,
  likeMetaMap,
  replyMetaMap,
  emptyReplyMeta,
  reviewedGameIds,
  locale,
  justNowLabel,
  colorLabels,
  resolveOpeningName,
  emptyLabel,
  aiReviewedBadgeLabel,
  moveLabel,
  newGameLabel,
}: Props) {
  if (games.length === 0) {
    return (
      <div className="text-center">
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        <div className="mt-4 flex justify-center">
          <Link href="/games/new" locale={locale}>
            <Button variant="outline" size="sm" icon={<FaPlus className="h-3 w-3" />}>
              {newGameLabel}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {games.map((g) => (
        <SharedGameListCard
          key={g.id}
          game={g}
          likeMeta={likeMetaMap.get(g.id)}
          replyMeta={replyMetaMap.get(g.id) ?? emptyReplyMeta}
          reviewed={reviewedGameIds.has(g.id)}
          aiReviewedBadgeLabel={aiReviewedBadgeLabel}
          colorLabels={colorLabels}
          resolveOpeningName={resolveOpeningName}
          justNowLabel={justNowLabel}
          locale={locale}
          extraMeta={
            g.plies.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {g.plies.map((ply) => (
                  <Link
                    key={ply}
                    href={`/games/shared/${g.id}#${ply + 1}`}
                    locale={locale}
                    className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {moveLabel(ply + 1)}
                  </Link>
                ))}
              </div>
            )
          }
        />
      ))}
    </div>
  );
}
