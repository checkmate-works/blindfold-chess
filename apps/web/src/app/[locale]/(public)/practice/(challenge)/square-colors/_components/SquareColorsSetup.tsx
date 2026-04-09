'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { PracticeSetupActions } from '@/app/[locale]/(public)/practice/(challenge)/_components/PracticeSetupActions';
import { SectionTitle } from '@/app/[locale]/_components';
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
      <SectionTitle className="mb-4">{t('howToPlayTitle')}</SectionTitle>

      <div className="mb-6 rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">{t('howToPlayDescription')}</p>
        <div className="text-4xl font-bold text-foreground mb-3">e4</div>
        <div className="max-w-[200px] mx-auto">
          <SquareColorAnswerButtons
            onAnswer={noop}
            disabled
            labels={{ white: t('white'), black: t('black') }}
          />
        </div>
      </div>

      <PracticeSetupActions locale={locale} moduleSlug="square-colors" />
    </div>
  );
}
