'use client';

import { useActionState, useState } from 'react';

import { Button, FormErrorBanner } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { ActionResult } from '@/lib/action-types';

import { OpeningCardWithProvider } from '@/app/[locale]/_components/OpeningCardWithProvider';
import type { Opening } from '@/app/[locale]/_components/OpeningSearch';
import { OpeningSearch } from '@/app/[locale]/_components/OpeningSearch';

import { saveAnswerAction } from '../_actions/saveAnswer';

type Props = {
  locale: string;
  questionKey: string;
  openings: Opening[];
};

export function OpeningSelectForm({ locale, questionKey, openings }: Props) {
  const t = useTranslations('interview.detail');
  const [selectedSlug, setSelectedSlug] = useState('');

  const boundSave = saveAnswerAction.bind(null, questionKey, locale);
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    boundSave,
    null
  );

  const selectedOpening = openings.find((o) => o.slug === selectedSlug);

  const errorMessage =
    state && 'error' in state
      ? t.has(`errors.${state.error}`)
        ? t(
            `errors.${state.error}` as
              | 'errors.unauthorized'
              | 'errors.banned'
              | 'errors.invalidQuestionKey'
              | 'errors.invalidAnswerValue'
              | 'errors.alreadyAnswered'
              | 'errors.rateLimited'
              | 'errors.unknown'
          )
        : t('errors.unknown')
      : null;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="answerValue" value={selectedSlug} />
      <FormErrorBanner message={errorMessage} />

      <OpeningSearch openings={openings} selectedSlug={selectedSlug} onSelect={setSelectedSlug} />

      {selectedOpening && (
        <OpeningCardWithProvider
          opening={selectedOpening}
          displayName={selectedOpening.translatedName}
          locale={locale}
          disableLink
        />
      )}

      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={!selectedSlug || isPending}
        loading={isPending}
      >
        {isPending ? t('saving') : t('save')}
      </Button>
    </form>
  );
}
