'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { PracticeHowToPlayCard } from '@/app/[locale]/(public)/practice/(challenge)/_components/PracticeHowToPlayCard';
import { PracticeSetupActions } from '@/app/[locale]/(public)/practice/(challenge)/_components/PracticeSetupActions';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SquareColorAnswerButtons } from './SquareColorAnswerButtons';

const noop = () => {};

type Props = {
  locale: Locale;
};

export function SquareColorsSetup({ locale }: Props) {
  const t = useTranslations('practice.squareColors');

  return (
    <div>
      <PracticeHowToPlayCard
        title={t('howToPlayTitle')}
        description={t('howToPlayDescription')}
        variant="plain"
      >
        <div className="text-4xl font-bold text-foreground mb-3">e4</div>
        <div className="max-w-[200px] mx-auto">
          <SquareColorAnswerButtons
            onAnswer={noop}
            disabled
            labels={{ white: t('white'), black: t('black') }}
          />
        </div>
      </PracticeHowToPlayCard>

      <PracticeSetupActions
        locale={locale}
        moduleSlug="square-colors"
        challengeTourId="square-colors-challenge"
        trainingTourId="square-colors-training"
      />
    </div>
  );
}
