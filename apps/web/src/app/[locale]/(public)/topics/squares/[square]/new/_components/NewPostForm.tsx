'use client';

import { useActionState, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, Textarea, UnsavedChangesDialog } from '@/app/_components';

import { createPost } from '../_actions/createPost';

type Props = {
  locale: string;
  square: string;
};

export function NewPostForm({ locale, square }: Props) {
  const t = useTranslations('topics.squares.newPostForm');
  const tUnsaved = useTranslations('unsavedChanges');
  const boundCreatePost = createPost.bind(null, locale, square);
  const [state, formAction, isPending] = useActionState(boundCreatePost, {});
  const [isDirty, setIsDirty] = useState(false);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  const errorMessage = state.error
    ? t.has(state.error)
      ? t(
          state.error as
            | 'contentRequired'
            | 'contentTooLong'
            | 'invalidReplyPermission'
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
        <label htmlFor="content" className="block text-sm font-medium text-foreground">
          {t('contentLabel')}
        </label>
        <Textarea
          id="content"
          name="content"
          rows={6}
          maxLength={5000}
          placeholder={t('contentPlaceholder')}
          required
          onChange={(e) => setIsDirty(e.target.value.length > 0)}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="replyPermission" className="block text-sm font-medium text-foreground">
          {t('replyPermissionLabel')}
        </label>
        <select
          id="replyPermission"
          name="replyPermission"
          defaultValue="everyone"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="everyone">{t('replyPermission_everyone')}</option>
          <option value="followers">{t('replyPermission_followers')}</option>
          <option value="nobody">{t('replyPermission_nobody')}</option>
        </select>
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
