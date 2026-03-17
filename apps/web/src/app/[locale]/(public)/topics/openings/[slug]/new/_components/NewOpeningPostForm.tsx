'use client';

import { useActionState, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, Textarea, UnsavedChangesDialog } from '@/app/_components';

import { createOpeningPost } from '../_actions/createOpeningPost';
import { RatingInput } from './RatingInput';

type Props = {
  locale: string;
  slug: string;
};

export function NewOpeningPostForm({ locale, slug }: Props) {
  const t = useTranslations('topics.openings.newPostForm');
  const tUnsaved = useTranslations('unsavedChanges');
  const boundCreatePost = createOpeningPost.bind(null, locale, slug);
  const [state, formAction, isPending] = useActionState(boundCreatePost, {});
  const [isDirty, setIsDirty] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [hasPreference, setHasPreference] = useState(false);
  const [hasProficiency, setHasProficiency] = useState(false);

  const hasAnyInput = hasContent || hasPreference || hasProficiency;

  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  const preferenceLabels: Record<string, string> = {
    '1': t('preferenceLabels.1'),
    '2': t('preferenceLabels.2'),
    '3': t('preferenceLabels.3'),
    '4': t('preferenceLabels.4'),
    '5': t('preferenceLabels.5'),
  };

  const proficiencyLabels: Record<string, string> = {
    '1': t('proficiencyLabels.1'),
    '2': t('proficiencyLabels.2'),
    '3': t('proficiencyLabels.3'),
    '4': t('proficiencyLabels.4'),
    '5': t('proficiencyLabels.5'),
  };

  const errorMessage = state.error
    ? t.has(state.error)
      ? t(
          state.error as
            | 'contentOrRatingRequired'
            | 'contentTooLong'
            | 'invalidOpening'
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

      <RatingInput
        name="preferenceRating"
        label={t('preferenceLabel')}
        labels={preferenceLabels}
        onChange={(hasValue) => {
          setHasPreference(hasValue);
          setIsDirty(true);
        }}
      />

      <RatingInput
        name="proficiencyRating"
        label={t('proficiencyLabel')}
        labels={proficiencyLabels}
        onChange={(hasValue) => {
          setHasProficiency(hasValue);
          setIsDirty(true);
        }}
      />

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
          onChange={(e) => {
            setHasContent(e.target.value.trim().length > 0);
            setIsDirty(true);
          }}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={isPending || !hasAnyInput}
        loading={isPending}
      >
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
