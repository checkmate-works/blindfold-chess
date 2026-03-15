'use client';

import { useActionState, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, Textarea, UnsavedChangesDialog } from '@/app/_components';

import { createReply } from '../_actions/createReply';

type Props = {
  locale: string;
  square: string;
  postId: string;
};

export function ReplyForm({ locale, square, postId }: Props) {
  const t = useTranslations('topics.squares.replies');
  const tUnsaved = useTranslations('unsavedChanges');
  const boundCreateReply = createReply.bind(null, locale, square, postId);
  const [state, formAction, isPending] = useActionState(boundCreateReply, {});
  const [isDirty, setIsDirty] = useState(false);

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
      {errorMessage && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {errorMessage}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="reply-content" className="block text-sm font-medium text-foreground">
          {t('contentLabel')}
        </label>
        <Textarea
          id="reply-content"
          name="content"
          rows={4}
          maxLength={5000}
          placeholder={t('contentPlaceholder')}
          required
          onChange={(e) => setIsDirty(e.target.value.length > 0)}
        />
      </div>

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
