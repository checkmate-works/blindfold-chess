'use client';

import { useActionState, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';

import { deleteAnswerAction } from '../_actions/deleteAnswer';

type Props = {
  questionKey: string;
  locale: string;
};

export function DeleteAnswerButton({ questionKey, locale }: Props) {
  const t = useTranslations('interview.detail');
  const [confirming, setConfirming] = useState(false);

  const boundDelete = deleteAnswerAction.bind(null, questionKey, locale);
  const [state, formAction, isPending] = useActionState(boundDelete, {});

  const errorMessage = state.error
    ? t.has(`errors.${state.error}`)
      ? t(
          `errors.${state.error}` as
            | 'errors.unauthorized'
            | 'errors.invalidQuestionKey'
            | 'errors.notFound'
            | 'errors.unknown'
        )
      : t('errors.unknown')
    : null;

  if (!confirming) {
    return (
      <Button type="button" variant="destructive" size="sm" onClick={() => setConfirming(true)}>
        {t('delete')}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      {errorMessage && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {errorMessage}
        </div>
      )}
      <p className="text-sm text-muted-foreground">{t('confirmDelete')}</p>
      <div className="flex gap-2">
        <form action={formAction}>
          <Button type="submit" variant="destructive" size="sm" disabled={isPending}>
            {isPending ? t('deleting') : t('delete')}
          </Button>
        </form>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
