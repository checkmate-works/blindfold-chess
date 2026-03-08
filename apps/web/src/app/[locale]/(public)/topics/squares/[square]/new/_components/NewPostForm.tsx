'use client';

import { useActionState } from 'react';

import { useTranslations } from 'next-intl';

import { Button, Textarea } from '@/app/_components';

import { createPost } from '../_actions/createPost';

type Props = {
  locale: string;
  square: string;
};

export function NewPostForm({ locale, square }: Props) {
  const t = useTranslations('topics.squares.newPostForm');
  const boundCreatePost = createPost.bind(null, locale, square);
  const [state, formAction, isPending] = useActionState(boundCreatePost, {});

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
        />
      </div>

      <Button type="submit" variant="primary" fullWidth disabled={isPending} loading={isPending}>
        {isPending ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}
