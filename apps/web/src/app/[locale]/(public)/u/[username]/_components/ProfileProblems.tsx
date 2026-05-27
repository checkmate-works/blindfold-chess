import type { LikeMeta } from '@/lib/db/like-queries';
import type { ReplyMeta } from '@/lib/db/reply-meta-queries';
import type { Position } from '@/lib/db/schema';

import { toggleLike } from '@/app/[locale]/(public)/practice/(free-play)/_actions/toggleLike';
import { PositionListCard } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionListCard';
import { PaginationNav } from '@/app/[locale]/_components';

type AuthorProfile = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type Props = {
  positions: Position[];
  /** Page-owner profile, reused for every row's avatar slot. */
  authorProfile: AuthorProfile;
  likeMetaMap: Map<string, LikeMeta>;
  replyMetaMap: Map<string, ReplyMeta>;
  emptyReplyMeta: ReplyMeta;
  currentPage: number;
  totalPages: number;
  locale: string;
  buildHref: (page: number) => string;
  /** `t('justNow')` resolved per practice namespace. */
  justNowLabels: {
    puzzle: string;
    memory: string;
  };
  labels: {
    noProblems: string;
    problemTypeMemory: string;
    problemTypePuzzle: string;
  };
};

const EMPTY_LIKE_META: LikeMeta = { likeCount: 0, likedByMe: false };

function getPositionHref(type: string, id: string): string {
  if (type === 'puzzle') return `/practice/puzzle/${id}`;
  return `/practice/position-memory/${id}`;
}

function TypeBadge({ type, label }: { type: string; label: string }) {
  const colorClass =
    type === 'puzzle'
      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';

  return (
    <span
      className={`inline-block shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}

export function ProfileProblems({
  positions,
  authorProfile,
  likeMetaMap,
  replyMetaMap,
  emptyReplyMeta,
  currentPage,
  totalPages,
  locale,
  buildHref,
  justNowLabels,
  labels,
}: Props) {
  return (
    <div>
      <div className="mt-4 space-y-3">
        {positions.length > 0 ? (
          positions.map((position) => {
            const isPuzzle = position.type === 'puzzle';
            return (
              <PositionListCard
                key={position.id}
                position={position}
                profile={authorProfile}
                likeMeta={likeMetaMap.get(position.id) ?? EMPTY_LIKE_META}
                replyMeta={replyMetaMap.get(position.id) ?? emptyReplyMeta}
                detailHref={getPositionHref(position.type, position.id)}
                i18nNamespace={isPuzzle ? 'practice.puzzle' : 'practice.positionMemory'}
                toggleLikeAction={toggleLike}
                justNowLabel={isPuzzle ? justNowLabels.puzzle : justNowLabels.memory}
                locale={locale}
                badge={
                  <TypeBadge
                    type={position.type}
                    label={isPuzzle ? labels.problemTypePuzzle : labels.problemTypeMemory}
                  />
                }
              />
            );
          })
        ) : (
          <p className="py-8 text-center text-muted-foreground">{labels.noProblems}</p>
        )}
      </div>

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
