'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SquareColorAnswerButtons } from './SquareColorAnswerButtons';
import { SquareColorQuestionDisplay } from './SquareColorQuestionDisplay';

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
        <div className="scale-75 origin-top">
          <SquareColorQuestionDisplay currentSquare="e4" lastAnswer={null} className="mb-4" />
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
