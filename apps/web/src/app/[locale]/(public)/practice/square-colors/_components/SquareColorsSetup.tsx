'use client';

import Link from 'next/link';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPlay } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SquareColorAnswerButtons } from './SquareColorAnswerButtons';

const noop = () => {};

type Props = {
  locale: Locale;
};

export function SquareColorsSetup({ locale }: Props) {
  const t = useTranslations('practice.squareColors');
  const tp = useTranslations('practice');

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

      <Link href={`/${locale}/practice/square-colors/challenge/session`}>
        <Button asChild variant="primary" size="lg" icon={<FaPlay />} className="w-full">
          {tp('startChallenge')}
        </Button>
      </Link>

      <div className="mt-4 text-center">
        <Link
          href={`/${locale}/practice/square-colors/training#square-colors-training-session`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {tp('switchToTraining')}
        </Link>
      </div>
    </div>
  );
}
