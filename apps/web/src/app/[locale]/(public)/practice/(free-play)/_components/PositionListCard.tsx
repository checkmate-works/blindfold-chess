import type { ReactNode } from 'react';

import type { LikeMeta } from '@/lib/db/like-queries';
import type { ReplyMeta } from '@/lib/db/reply-meta-queries';
import type { Position } from '@/lib/db/schema';

import { CatalogListCard } from '@/app/[locale]/_components/CatalogListCard';

type ToggleLikeAction = (
  postId: string,
  locale: string,
  topicKey: string
) => Promise<{ liked: boolean; likeCount: number } | { error: string }>;

type Props = {
  position: Position;
  profile: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  likeMeta: LikeMeta;
  replyMeta: ReplyMeta;
  detailHref: string;
  i18nNamespace: string;
  toggleLikeAction: ToggleLikeAction;
  justNowLabel: string;
  locale: string;
  badge?: ReactNode;
  actions?: ReactNode;
};

/**
 * Position-flavored shorthand for {@link CatalogListCard}. Threads the
 * raw `position` row's fields through and pins the `topicKey` to the
 * position id — preserving the call-site shape that the puzzle, memory,
 * mypage, profile, fork-list, and chunk-detail pages already pass.
 */
export function PositionListCard({ position, ...rest }: Props) {
  return (
    <CatalogListCard
      id={position.id}
      fen={position.fen}
      title={position.title}
      description={position.description}
      createdAt={position.createdAt}
      topicKey={position.id}
      // Puzzle / position-memory detail pages have an `id="comments"`
      // section + ScrollToHashOnMount, so the comment icon can scroll
      // straight to it — see the CatalogListCard `commentHref` TSDoc.
      commentHref={`${rest.detailHref}#comments`}
      {...rest}
    />
  );
}
