'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { BasePostForm } from '@/app/[locale]/(public)/topics/_components/BasePostForm';

import { createOpeningPost } from '../_actions/createOpeningPost';
import { RatingInput } from './RatingInput';

type Props = {
  locale: string;
  slug: string;
};

export function NewOpeningPostForm({ locale, slug }: Props) {
  const t = useTranslations('topics.openings.newPostForm');
  const boundCreatePost = createOpeningPost.bind(null, locale, slug);

  const [hasContent, setHasContent] = useState(false);
  const [hasPreference, setHasPreference] = useState(false);
  const [hasProficiency, setHasProficiency] = useState(false);

  const hasAnyInput = hasContent || hasPreference || hasProficiency;

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

  return (
    <BasePostForm
      action={boundCreatePost}
      translationNamespace="topics.openings.newPostForm"
      contentRequired={false}
      submitDisabled={!hasAnyInput}
      onContentChange={(hasValue) => setHasContent(hasValue)}
      beforeContent={(markDirty) => (
        <>
          <RatingInput
            name="preferenceRating"
            label={t('preferenceLabel')}
            labels={preferenceLabels}
            onChange={(hasValue) => {
              setHasPreference(hasValue);
              markDirty();
            }}
          />

          <RatingInput
            name="proficiencyRating"
            label={t('proficiencyLabel')}
            labels={proficiencyLabels}
            onChange={(hasValue) => {
              setHasProficiency(hasValue);
              markDirty();
            }}
          />
        </>
      )}
    />
  );
}
