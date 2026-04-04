import type { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { GiBlackBelt } from 'react-icons/gi';

import { RankCard } from '@/app/[locale]/(public)/ranks/_components/RankCard';
import { buildRankTeaserCards } from '@/app/[locale]/(public)/ranks/_lib/helpers';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  t: Awaited<ReturnType<typeof getTranslations<'landing'>>>;
  tRanks: Awaited<ReturnType<typeof getTranslations<'ranks'>>>;
};

export function RanksSection({ locale, t, tRanks }: Props) {
  const teaserCards = buildRankTeaserCards(locale, tRanks).map((props) => (
    <RankCard key={props.slug} {...props} />
  ));

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-secondary/30 to-background border-t border-border/50">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center text-green-600 text-3xl">
          <GiBlackBelt />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">{t('ranks.title')}</h2>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t('ranks.description')}</p>

        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto text-left">{teaserCards}</div>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8">
          <Link
            href={`/${locale}/ranks`}
            className="inline-flex items-center justify-center rounded-md bg-secondary px-8 py-3 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {t('ranks.cta')}
          </Link>
        </div>
      </div>
    </section>
  );
}
