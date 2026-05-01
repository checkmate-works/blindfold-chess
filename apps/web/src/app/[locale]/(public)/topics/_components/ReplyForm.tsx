'use client';

import { useActionState, useId, useState } from 'react';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, FormErrorBanner, Textarea, UnsavedChangesDialog } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { MAX_CONTENT_LENGTH } from '@/lib/validations/content';

type CreateReplyState = { error?: string };

type CreateReplyAction = (
  locale: string,
  topicKey: string,
  postId: string,
  prevState: CreateReplyState,
  formData: FormData
) => Promise<CreateReplyState>;

type Props = {
  locale: string;
  topicKey: string;
  postId: string;
  createReplyAction: CreateReplyAction;
  i18nNamespace: string;
  replyToId?: string;
  replyToUsername?: string;
  onCancelReply?: () => void;
  /**
   * When `true`, render an `isSpoiler` checkbox below the content textarea.
   * Mirrors `BasePostForm.enableSpoilerToggle` so a reply can self-flag as
   * containing the puzzle solution. The checkbox name is `isSpoiler` and the
   * value submitted is the standard `'on'` — the Server Action wrapper is
   * responsible for normalizing it to a boolean.
   */
  enableSpoilerToggle?: boolean;
};

export function ReplyForm({
  locale,
  topicKey,
  postId,
  createReplyAction,
  i18nNamespace,
  replyToId,
  replyToUsername,
  onCancelReply,
  enableSpoilerToggle = false,
}: Props) {
  const t = useTranslations(i18nNamespace);
  const tTopics = useTranslations('topics');
  const tUnsaved = useTranslations('unsavedChanges');
  const boundCreateReply = createReplyAction.bind(null, locale, topicKey, postId);
  const [state, formAction, isPending] = useActionState(boundCreateReply, {});
  const [isDirty, setIsDirty] = useState(false);
  // Unique per-instance id for the textarea so multiple ReplyForms can
  // coexist on the same page (Reddit-style inline reply forms under each
  // CommentNode) without colliding `id` / `htmlFor` and without breaking
  // assistive-tech labelling.
  const textareaId = useId();

  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  const errorMessage = state.error
    ? t.has(state.error)
      ? t(
          state.error as
            | 'contentRequired'
            | 'contentTooLong'
            | 'error'
            | 'signInRequired'
            | 'rateLimited'
        )
      : t('error')
    : null;

  return (
    <form action={formAction} className="space-y-4">
      <FormErrorBanner message={errorMessage} />

      {replyToId && replyToUsername && (
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
      )}

      <div className="space-y-2">
        <label htmlFor={textareaId} className="block text-sm font-medium text-foreground">
          {t('contentLabel')}
        </label>
        <Textarea
          id={textareaId}
          name="content"
          rows={4}
          maxLength={MAX_CONTENT_LENGTH}
          placeholder={t('contentPlaceholder')}
          required
          onChange={(e) => setIsDirty(e.target.value.length > 0)}
        />
      </div>

      {enableSpoilerToggle && (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="isSpoiler"
            className="h-4 w-4 rounded border-border"
            onChange={() => setIsDirty(true)}
          />
          {tTopics('spoiler.toggleLabel')}
        </label>
      )}

      <Button type="submit" variant="primary" fullWidth disabled={isPending} loading={isPending}>
        {isPending ? t('submitting') : t('submit')}
      </Button>

      <UnsavedChangesDialog
        open={isBlocking}
        onConfirm={confirm}
        onCancel={cancel}
        title={tUnsaved('title')}
        message={tUnsaved('message')}
        confirmLabel={tUnsaved('confirm')}
        cancelLabel={tUnsaved('cancel')}
      />
    </form>
  );
}
