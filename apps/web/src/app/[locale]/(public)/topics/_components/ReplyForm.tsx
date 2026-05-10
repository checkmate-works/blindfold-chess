'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { BasePostForm } from './BasePostForm';
import type { AttachmentActions } from './BasePostForm';

type ReplyAction = (
  locale: string,
  topicKey: string,
  postId: string,
  prevState: { error?: string },
  formData: FormData
) => Promise<{ error?: string }>;

/**
 * Per-form Server Actions for the attachment-enabled reply flow.
 * Mirrors `AttachmentActions` on `BasePostForm` but with the
 * reply-specific `(locale, topicKey, postId, prevState, formData)`
 * binding shape that `CommentNode` already passes down.
 */
export type ReplyAttachmentActions = {
  pgn: ReplyAction;
  fen: ReplyAction;
};

type Props = {
  locale: string;
  topicKey: string;
  postId: string;
  /**
   * Attachment-aware Server Actions (PGN + FEN). The base form
   * dispatches to `pgn` for plain / PGN / Lichess URL attachments and
   * to `fen` for FEN attachments. The `pgn` action also handles the
   * empty-attachment fast-path (plain reply, no attachment row),
   * matching the post form contract.
   */
  attachmentActions: ReplyAttachmentActions;
  i18nNamespace: string;
  replyToId?: string;
  replyToUsername?: string;
  onCancelReply?: () => void;
  /**
   * When `true`, render an `isSpoiler` checkbox below the content textarea.
   * Mirrors `BasePostForm.enableSpoilerToggle` so a reply can self-flag as
   * containing the puzzle solution.
   */
  enableSpoilerToggle?: boolean;
};

/**
 * Inline reply form rendered under each `CommentNode`.
 *
 * @design Attachment integration (#84 phase D)
 *
 * `ReplyForm` is now a thin wrapper around `BasePostForm` — the form
 * chrome (textarea, paperclip + AttachmentModal, content counter,
 * spoiler toggle, submit button, unsaved-changes guard) is inherited.
 * The reply-specific UI (the "replying to @username" cue + cancel
 * button + `replyToId` hidden input) is injected via `beforeContent`.
 *
 * The `(locale, topicKey, postId)` curry happens here so the bound
 * action presented to `BasePostForm` matches the
 * `(prevState, formData) => Promise<...>` shape its action contract
 * expects. `useActionState`'s identity-pinning concern stays inside
 * `BasePostForm` — `attachmentActions` is recreated per render but the
 * wrapped action's identity is stable across re-renders thanks to
 * `useCallback` + the attachment ref pattern there.
 */
export function ReplyForm({
  locale,
  topicKey,
  postId,
  attachmentActions,
  i18nNamespace,
  replyToId,
  replyToUsername,
  onCancelReply,
  enableSpoilerToggle = false,
}: Props) {
  const t = useTranslations(i18nNamespace);

  const boundActions: AttachmentActions = {
    pgn: attachmentActions.pgn.bind(null, locale, topicKey, postId),
    fen: attachmentActions.fen.bind(null, locale, topicKey, postId),
  };

  return (
    <BasePostForm
      attachmentActions={boundActions}
      translationNamespace={i18nNamespace}
      enableSpoilerToggle={enableSpoilerToggle}
      textareaRows={4}
      emitReplyPermissionField={false}
      beforeContent={() =>
        replyToId && replyToUsername ? (
          <>
            <input type="hidden" name="replyToId" value={replyToId} />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t('replyingTo', { username: replyToUsername })}</span>
              <button
                type="button"
                onClick={onCancelReply}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={t('cancelReply')}
              >
                &times;
              </button>
            </div>
          </>
        ) : null
      }
    />
  );
}
