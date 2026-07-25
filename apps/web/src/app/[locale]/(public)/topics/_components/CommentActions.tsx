'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FiEdit2 } from 'react-icons/fi';

import { ActionsMenu, ActionsMenuButton } from '@/app/[locale]/_components/ActionsMenu';

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
 * The like / reply affordance row beneath a (non-deleted, non-editing)
 * comment body, plus a "⋯" kebab (`ActionsMenu`) holding the owner-only
 * edit / delete actions. Thread-wide values (locale, actions, i18n) are
 * read from `CommentTreeContext`, the same source `CommentNode` uses, so this
 * stays a thin presentational row rather than a 14-prop pass-through.
 *
 * Edit and Delete live behind the kebab (rather than as inline buttons) so
 * destructive / mutating self-actions are one deliberate tap away and the row
 * stays uncluttered — matching the detail-page `ActionsMenu` pattern.
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
      {isOwnComment && (
        <ActionsMenu ariaLabel={tTopics('moreActions')}>
          {editPostAction && (
            <ActionsMenuButton onClick={onEdit}>
              <FiEdit2 className="h-4 w-4" aria-hidden />
              {tTopics('edit.button')}
            </ActionsMenuButton>
          )}
          <DeletePostButton
            postId={node.id}
            locale={locale}
            redirectPath={redirectPath}
            deletePostAction={deletePostAction}
            i18nNamespace={i18n.deleteNamespace}
            variant="menuItem"
            // A reply lives ON the current page; deleting it must not
            // navigate to `redirectPath` (the listing), or the whole thread
            // appears to vanish. Stay put and refresh in place.
            stayOnPage
          />
        </ActionsMenu>
      )}
    </div>
  );
}
