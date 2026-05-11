'use client';

import { type ReactNode, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { ActionResult } from '@/lib/action-types';
import type { PostAttachment } from '@/lib/games/get-attachments-for-posts';

import { LinkedText } from '@/app/[locale]/_components/LinkedText';
import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';

import type { AttachmentKind } from '../_actions/removePostAttachment';
import { formatAbsoluteDateTime } from '../_lib/absolute-time';
import { DeletePostButton } from './DeletePostButton';
import { EditPostForm } from './EditPostForm';
import { EditableAttachments } from './EditableAttachments';
import { EditedIndicator } from './EditedIndicator';
import { LikeButton } from './LikeButton';

type ToggleLikeAction = (
  postId: string,
  locale: string,
  topicKey: string
) => Promise<{ liked: boolean; likeCount: number } | { error: string }>;

type DeletePostAction = (postId: string, locale: string) => Promise<ActionResult>;

type EditPostAction = (
  postId: string,
  locale: string,
  formData: FormData
) => Promise<
  { success: true; content: string; isSpoiler: boolean; updatedAt: Date } | { error: string }
>;

type RemoveAttachmentAction = (
  postId: string,
  attachmentId: string,
  kind: AttachmentKind,
  locale: string
) => Promise<{ success: true } | { error: string }>;

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
  userId: string;
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
  /** Raw OP attachment payload (typed); see `opAttachment` for read-mode render. */
  opAttachmentRaw?: PostAttachment | null;
  /** Fallback `<AttachedVideoCard>` title for the edit-side renderer. */
  attachmentFallbackVideoTitle?: string;
  redirectPath: string;
  likeI18nNamespace: string;
  deleteI18nNamespace: string;
};

/**
 * Top-level OP card on `/topics/.../posts/<postId>` and
 * `/chunks/.../posts/<postId>` pages.
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
  opAttachmentRaw,
  attachmentFallbackVideoTitle,
  redirectPath,
  likeI18nNamespace,
  deleteI18nNamespace,
}: Props) {
  const tEdit = useTranslations('topics.edit');

  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(initialContent);
  const [localUpdatedAt, setLocalUpdatedAt] = useState(updatedAt);

  const isOwnPost = currentUserId !== undefined && currentUserId === userId;
  const canEdit = isOwnPost && editPostAction !== undefined;
  const wasEdited = localUpdatedAt.getTime() > createdAt.getTime();

  const authorName = author?.displayName || author?.username || 'Anonymous';
  const profileHref = author?.username ? `/u/${author.username}` : null;

  return (
    <div className="p-4 bg-card border border-border rounded-lg space-y-4">
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
          {opAttachmentRaw && removeAttachmentAction && (
            <EditableAttachments
              postId={postId}
              locale={locale}
              attachment={opAttachmentRaw}
              removeAttachmentAction={removeAttachmentAction}
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
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {tEdit('button')}
              </button>
            )}
            {isOwnPost && (
              <DeletePostButton
                postId={postId}
                locale={locale}
                redirectPath={redirectPath}
                deletePostAction={deletePostAction}
                i18nNamespace={deleteI18nNamespace}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
