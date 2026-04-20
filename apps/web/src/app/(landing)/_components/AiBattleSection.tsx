import type { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { FaRobot } from 'react-icons/fa';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  t: Awaited<ReturnType<typeof getTranslations<'landing'>>>;
};

export function AiBattleSection({ locale, t }: Props) {
  return (
    <section id="ai-battle" className="py-24 px-6 bg-card border-y border-border/50">
      <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-3xl">
          <FaRobot />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">{t('aiBattle.title')}</h2>
        </div>
        <p className="text-lg leading-relaxed text-muted-foreground max-w-2xl">
          {t('aiBattle.description')}
        </p>
        <div className="pt-4 flex justify-center">
          <Link
            href={`/${locale}/games/new`}
            className="inline-flex items-center justify-center rounded-md bg-secondary px-8 py-3 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {t('aiBattle.cta')}
          </Link>
        </div>
      </div>
    </section>
  );
}
