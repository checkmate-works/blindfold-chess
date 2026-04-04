import type { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { FaPalette, FaRoute } from 'react-icons/fa';

import type { Locale } from '@/app/[locale]/_lib/types';

import { TrainingCard } from './TrainingCard';

type Props = {
  locale: Locale;
  t: Awaited<ReturnType<typeof getTranslations<'landing'>>>;
};

export function TrainingSection({ locale, t }: Props) {
  return (
    <section className="py-24 px-6 bg-card border-y border-border/50">
      <div className="max-w-6xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">{t('training.title')}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('training.description')}
          </p>
        </div>
        <div className="flex justify-center mb-8">
          <Link
            href={`/${locale}/practice`}
            className="inline-flex items-center justify-center rounded-md bg-secondary px-8 py-3 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {t('training.viewAll')}
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <TrainingCard
            icon={<FaPalette />}
            iconColor="blue"
            title={t('training.squareColors.title')}
            description={t('training.squareColors.description')}
            href={`/${locale}/practice/square-colors`}
            cta={t('training.squareColors.cta')}
          />
          <TrainingCard
            icon={<FaRoute />}
            iconColor="orange"
            title={t('training.routePlanner.title')}
            description={t('training.routePlanner.description')}
            href={`/${locale}/practice/route-planner`}
            cta={t('training.routePlanner.cta')}
          />
        </div>
      </div>
    </section>
  );
}
