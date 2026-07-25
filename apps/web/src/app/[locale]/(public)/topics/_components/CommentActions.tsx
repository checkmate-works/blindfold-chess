'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { CommentTreeNode } from '../_lib/comment-tree';
import { useCommentTreeContext } from './CommentTreeContext';
import { LikeButton } from './LikeButton';

type Props = {
  node: CommentTreeNode;
  onReply: () => void;
};

/**
 * The like / reply affordance row beneath a (non-deleted, non-editing)
 * comment body. Thread-wide values (locale, actions, i18n) are read from
 * `CommentTreeContext`, the same source `CommentNode` uses, so this stays a
 * thin presentational row rather than a 14-prop pass-through.
 *
 * The owner-only edit / delete actions do NOT live here — they sit in the
 * "⋯" menu in the comment header (see `CommentOwnerMenu`), matching the SNS /
 * detail-page convention of anchoring self-actions to the author row.
 */
export function CommentActions({ node, onReply }: Props) {
  const tTopics = useTranslations('topics');
  const { locale, topicKey, currentUserId, canReply, toggleLikeAction, i18n } =
    useCommentTreeContext();

  return (
    <div className="flex items-center gap-4">
      <LikeButton
        postId={node.id}
        locale={locale}
        topicKey={topicKey}
        initialLikeCount={node.likeMeta.likeCount}
        initialLikedByMe={node.likeMeta.likedByMe}
        toggleLikeAction={toggleLikeAction}
        i18nNamespace={i18n.likeNamespace}
      />
      {canReply && currentUserId !== undefined && (
        <button
          type="button"
          onClick={onReply}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {tTopics('replyButton')}
        </button>
      )}
    </div>
  );
}
