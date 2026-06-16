'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { CommentTreeNode } from '../_lib/comment-tree';
import { useCommentTreeContext } from './CommentTreeContext';
import { DeletePostButton } from './DeletePostButton';
import { LikeButton } from './LikeButton';

type Props = {
  node: CommentTreeNode;
  isOwnComment: boolean;
  onReply: () => void;
  onEdit: () => void;
};

/**
 * The like / reply / edit / delete affordance row beneath a (non-deleted,
 * non-editing) comment body. Thread-wide values (locale, actions, i18n) are
 * read from `CommentTreeContext`, the same source `CommentNode` uses, so this
 * stays a thin presentational row rather than a 14-prop pass-through.
 */
export function CommentActions({ node, isOwnComment, onReply, onEdit }: Props) {
  const tTopics = useTranslations('topics');
  const {
    locale,
    topicKey,
    currentUserId,
    canReply,
    redirectPath,
    toggleLikeAction,
    deletePostAction,
    editPostAction,
    i18n,
  } = useCommentTreeContext();

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
      {isOwnComment && editPostAction && (
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {tTopics('edit.button')}
        </button>
      )}
      {isOwnComment && (
        <DeletePostButton
          postId={node.id}
          locale={locale}
          redirectPath={redirectPath}
          deletePostAction={deletePostAction}
          i18nNamespace={i18n.deleteNamespace}
          // A reply lives ON the current page; deleting it must not
          // navigate to `redirectPath` (the listing), or the whole thread
          // appears to vanish. Stay put and refresh in place.
          stayOnPage
        />
      )}
    </div>
  );
}
