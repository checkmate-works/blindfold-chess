'use client';

import Link from 'next/link';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaInfinity, FaPlay } from 'react-icons/fa';

import { Divider, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SquareColorAnswerButtons } from './SquareColorAnswerButtons';

const noop = () => {};

type Props = {
  locale: Locale;
};

export function SquareColorsSetup({ locale }: Props) {
  const t = useTranslations('practice.squareColors');
  const tp = useTranslations('practice');

  const challengeHref = `/${locale}/practice/square-colors/challenge/session`;
  const trainingHref = `/${locale}/practice/square-colors/training#square-colors-training-session`;

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

      <Link href={challengeHref}>
        <Button asChild variant="primary" size="lg" icon={<FaPlay />} className="w-full">
          {tp('startChallenge')}
        </Button>
      </Link>

      <div className="my-6 mx-auto flex w-4/5 items-center gap-4">
        <Divider className="flex-1" />
        <span className="text-sm text-muted-foreground">{tp('orDivider')}</span>
        <Divider className="flex-1" />
      </div>

      <Link href={trainingHref}>
        <Button asChild variant="outline" size="lg" icon={<FaInfinity />} className="w-full">
          {tp('startTraining')}
        </Button>
      </Link>
    </div>
  );
}
