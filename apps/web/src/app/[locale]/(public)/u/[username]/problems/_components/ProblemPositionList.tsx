import { EMPTY_LIKE_META, type LikeMeta } from '@/lib/db/like-queries';
import type { ReplyMeta } from '@/lib/db/reply-meta-queries';
import type { Position } from '@/lib/db/schema';
import { type PositionKind, getPositionKindDetailPath } from '@/lib/positions/kind';
import type { AuthorProfile } from '@/lib/users/author-profile';

import { toggleLike } from '@/app/[locale]/(public)/practice/(free-play)/_actions/toggleLike';
import { PositionListCard } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionListCard';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  type: PositionKind;
  positions: Position[];
  /** Page-owner profile, reused for every row's avatar slot. */
  authorProfile: AuthorProfile;
  likeMetaMap: Map<string, LikeMeta>;
  replyMetaMap: Map<string, ReplyMeta>;
  emptyReplyMeta: ReplyMeta;
  currentPage: number;
  totalPages: number;
  locale: Locale;
  buildHref: (page: number) => string;
  justNowLabel: string;
  labels: {
    noProblems: string;
  };
};

function getPositionHref(type: PositionKind, id: string): string {
  return getPositionKindDetailPath(type, id);
}

/**
 * Single-type problem list for the `/problems/{puzzles,position-memory}`
 * pages. Unlike the old mixed-type ProfileProblems list, every row here is
 * the same type (the URL already says which), so no per-row type badge is
 * needed.
 */
export function ProblemPositionList({
  type,
  positions,
  authorProfile,
  likeMetaMap,
  replyMetaMap,
  emptyReplyMeta,
  currentPage,
  totalPages,
  locale,
  buildHref,
  justNowLabel,
  labels,
}: Props) {
  return (
    <div>
      <div className="mt-4 space-y-3">
        {positions.length > 0 ? (
          positions.map((position) => (
            <PositionListCard
              key={position.id}
              position={position}
              profile={authorProfile}
              likeMeta={likeMetaMap.get(position.id) ?? EMPTY_LIKE_META}
              replyMeta={replyMetaMap.get(position.id) ?? emptyReplyMeta}
              detailHref={getPositionHref(type, position.id)}
              i18nNamespace={type === 'puzzle' ? 'practice.puzzle' : 'practice.positionMemory'}
              toggleLikeAction={toggleLike}
              justNowLabel={justNowLabel}
              locale={locale}
            />
          ))
        ) : (
          <p className="py-8 text-center text-muted-foreground">{labels.noProblems}</p>
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
