'use client';

import { type ReactNode, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FiEdit2 } from 'react-icons/fi';

import type { PostAttachment } from '@/lib/games/get-attachments-for-posts';

import { ActionsMenu, ActionsMenuButton } from '@/app/[locale]/_components/ActionsMenu';
import { LinkedText } from '@/app/[locale]/_components/LinkedText';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';

import { formatAbsoluteDateTime } from '../_lib/absolute-time';
import type {
  AttachAction,
  DeletePostAction,
  EditPostAction,
  RemoveAttachmentAction,
  ToggleLikeAction,
} from '../_lib/action-types';
import { DeletePostButton } from './DeletePostButton';
import { EditPostForm } from './EditPostForm';
import { EditableAttachments } from './EditableAttachments';
import { EditedIndicator } from './EditedIndicator';
import { LikeButton } from './LikeButton';

type Author = {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  flair: string | null;
  country: string | null;
} | null;

type Props = {
  postId: string;
  locale: string;
  topicKey: string;
  // Null when the author was anonymised (account purged) — nobody owns the post.
  userId: string | null;
  currentUserId?: string;
  author: Author;
  initialContent: string;
  createdAt: Date;
  updatedAt: Date;
  /** Optional per-OP metadata slot (e.g. opening rating). */
  opMeta?: ReactNode;
  /** Optional per-OP attachment slot (game / FEN / video / embed). */
  opAttachment?: ReactNode;
  initialLikeCount: number;
  initialLikedByMe: boolean;
  toggleLikeAction: ToggleLikeAction;
  deletePostAction: DeletePostAction;
  /**
   * Optional in-place edit action. When provided AND the OP is authored by
   * the current user, the Edit button renders next to Delete. When the
   * OP enters edit mode, the attachment / actions row are hidden so the
   * form has the card to itself.
   */
  editPostAction?: EditPostAction;
  /**
   * Optional attachment-remove Server Action. Paired with `opAttachmentRaw`
   * so the edit-mode body can surface a "Remove attachment" control. Read-
   * mode still flows through the pre-rendered `opAttachment` slot.
   */
  removeAttachmentAction?: RemoveAttachmentAction;
  /**
   * Optional edit-flow attach actions. When provided AND the OP currently
   * has no attachment, the edit mode surfaces an "Add attachment" button
   * that opens the AttachmentModal and routes the apply payload to the
   * matching action.
   */
  attachPgnAction?: AttachAction;
  attachFenAction?: AttachAction;
  /** Raw OP attachment payload (typed); see `opAttachment` for read-mode render. */
  opAttachmentRaw?: PostAttachment | null;
  /** Fallback `<AttachedVideoCard>` title for the edit-side renderer. */
  attachmentFallbackVideoTitle?: string;
  redirectPath: string;
  likeI18nNamespace: string;
  deleteI18nNamespace: string;
};

/**
 * Top-level OP card on `/topics/.../posts/<postId>` pages.
 *
 * Was previously inlined inside `TopicPostDetailLayout`; lifted into its
 * own client boundary so the body can swap to `EditPostForm` in place
 * when the author clicks "Edit". The `(edited)` marker next to the
 * timestamp updates from the same local state, so an inline edit
 * reflects immediately without a router round-trip.
 */
export function OpCard({
  postId,
  locale,
  topicKey,
  userId,
  currentUserId,
  author,
  initialContent,
  createdAt,
  updatedAt,
  opMeta,
  opAttachment,
  initialLikeCount,
  initialLikedByMe,
  toggleLikeAction,
  deletePostAction,
  editPostAction,
  removeAttachmentAction,
  attachPgnAction,
  attachFenAction,
  opAttachmentRaw,
  attachmentFallbackVideoTitle,
  redirectPath,
  likeI18nNamespace,
  deleteI18nNamespace,
}: Props) {
  const tEdit = useTranslations('topics.edit');
  const tTopics = useTranslations('topics');
  const tCommon = useTranslations('Common');

  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(initialContent);
  const [localUpdatedAt, setLocalUpdatedAt] = useState(updatedAt);

  const isOwnPost = currentUserId !== undefined && currentUserId === userId;
  const canEdit = isOwnPost && editPostAction !== undefined;
  const wasEdited = localUpdatedAt.getTime() > createdAt.getTime();

  const authorName = author?.displayName || author?.username || tCommon('deletedUser');
  const profileHref = author?.username ? `/u/${author.username}` : null;

  return (
    <div className="p-4 bg-card border border-border rounded-lg space-y-4">
      {/* Author row: avatar/name/timestamp on the left, the owner-only "⋯"
          menu pinned top-right (matching the comment tree + detail pages).
          Hidden while editing so the edit form owns the card. */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <UserAvatar
            profileHref={profileHref}
            avatarUrl={author?.avatarUrl}
            displayName={authorName}
            locale={locale}
            size="md"
            flair={author?.flair}
            country={author?.country}
          >
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <time dateTime={createdAt.toISOString()}>
                {formatAbsoluteDateTime(createdAt, locale, 'long')}
              </time>
              {wasEdited && <EditedIndicator updatedAt={localUpdatedAt} locale={locale} />}
            </div>
          </UserAvatar>
        </div>
        {isOwnPost && !isEditing && (
          <ActionsMenu ariaLabel={tTopics('moreActions')}>
            {canEdit && (
              <ActionsMenuButton onClick={() => setIsEditing(true)}>
                <FiEdit2 className="h-4 w-4" aria-hidden />
                {tEdit('button')}
              </ActionsMenuButton>
            )}
            <DeletePostButton
              postId={postId}
              locale={locale}
              redirectPath={redirectPath}
              deletePostAction={deletePostAction}
              i18nNamespace={deleteI18nNamespace}
              variant="menuItem"
            />
          </ActionsMenu>
        )}
      </div>

      {opMeta}

      {isEditing && editPostAction ? (
        <>
          <EditPostForm
            postId={postId}
            locale={locale}
            initialContent={localContent}
            initialIsSpoiler={false}
            enableSpoilerToggle={false}
            editPostAction={editPostAction}
            onSaved={(next) => {
              setLocalContent(next.content);
              setLocalUpdatedAt(next.updatedAt);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
          {removeAttachmentAction &&
            (opAttachmentRaw || attachPgnAction !== undefined || attachFenAction !== undefined) && (
              <EditableAttachments
                postId={postId}
                locale={locale}
                attachment={opAttachmentRaw ?? null}
                removeAttachmentAction={removeAttachmentAction}
                attachPgnAction={attachPgnAction}
                attachFenAction={attachFenAction}
                fallbackVideoTitle={attachmentFallbackVideoTitle ?? ''}
              />
            )}
        </>
      ) : (
        <>
          <div className="text-foreground whitespace-pre-wrap break-words leading-relaxed">
            <LinkedText text={localContent} locale={locale} />
          </div>

          {opAttachment}

          <div className="flex items-center gap-4">
            <LikeButton
              postId={postId}
              locale={locale}
              topicKey={topicKey}
              initialLikeCount={initialLikeCount}
              initialLikedByMe={initialLikedByMe}
              toggleLikeAction={toggleLikeAction}
              i18nNamespace={likeI18nNamespace}
            />
          </div>
        </>
      )}
    </div>
  );
}
