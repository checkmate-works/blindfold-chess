'use client';

import Link from 'next/link';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPlay } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

export function QuadrantsSetup({ locale }: Props) {
  const t = useTranslations('practice.quadrantAnchors');
  const tp = useTranslations('practice');

  return (
    <div>
      <SectionTitle className="mb-4">{t('howToPlayTitle')}</SectionTitle>

      <div className="mb-6 rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">{t('howToPlayDescription')}</p>
        <div className="text-4xl font-bold text-foreground mb-3">e4</div>
        <p className="text-sm text-muted-foreground">{t('question', { square: 'e4' })}</p>
      </div>

      <Link href={`/${locale}/practice/quadrants/challenge`}>
        <Button asChild variant="primary" size="lg" icon={<FaPlay />} className="w-full">
          {tp('startChallenge')}
        </Button>
      </Link>

      <div className="mt-4 text-center">
        <Link
          href={`/${locale}/practice/quadrants/training#quadrants-training-session`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {tp('switchToTraining')}
        </Link>
      </div>
    </div>
  );
}
