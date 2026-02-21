import type { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { FaGraduationCap } from 'react-icons/fa';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  t: Awaited<ReturnType<typeof getTranslations<'landing'>>>;
};

export function LearnSection({ locale, t }: Props) {
  return (
    <section className="py-24 px-6 bg-gradient-to-b from-secondary/30 to-background border-t border-border/50">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center text-green-600 text-3xl">
          <FaGraduationCap />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">{t('learn.title')}</h2>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('learn.description')}
          <Link
            href={`/${locale}/learn/memory/de-groot-experiment`}
            className="text-muted-foreground underline hover:text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm transition-colors"
          >
            {t('learn.deGrootLink')}
          </Link>
          {t('learn.descriptionSuffix')}
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8">
          <Link
            href={`/${locale}/learn`}
            className="inline-flex items-center justify-center rounded-md bg-secondary px-8 py-3 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {t('learn.cta')}
          </Link>
        </div>
      </div>
    </section>
  );
}
