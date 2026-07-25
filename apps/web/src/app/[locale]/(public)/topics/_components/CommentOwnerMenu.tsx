'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FiEdit2 } from 'react-icons/fi';

import { ActionsMenu, ActionsMenuButton } from '@/app/[locale]/_components/ActionsMenu';

import type { CommentTreeNode } from '../_lib/comment-tree';
import { useCommentTreeContext } from './CommentTreeContext';
import { DeletePostButton } from './DeletePostButton';

type Props = {
  node: CommentTreeNode;
  /** Enter edit mode for this comment (owned by `CommentNode`). */
  onEdit: () => void;
};

/**
 * Owner-only "⋯" overflow menu (edit / delete) for a single comment, rendered
 * top-right in the comment header. That placement matches every major SNS
 * (X, Facebook, Instagram, YouTube) and the app's own content detail pages
 * (`PositionAuthorHeader`), rather than sitting in the bottom like/reply row.
 *
 * Thread-wide values (locale, actions, i18n) come from `CommentTreeContext`,
 * the same source `CommentActions` reads, so this stays a thin presentational
 * node. The caller is responsible for only mounting it on the viewer's own,
 * non-deleted, non-collapsed, non-editing comment.
 */
export function CommentOwnerMenu({ node, onEdit }: Props) {
  const tTopics = useTranslations('topics');
  const { locale, redirectPath, deletePostAction, editPostAction, i18n } = useCommentTreeContext();

  return (
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
        // A reply lives ON the current page; deleting it must not navigate to
        // `redirectPath` (the listing), or the whole thread appears to vanish.
        // Stay put and refresh in place.
        stayOnPage
      />
    </ActionsMenu>
  );
}
