import { getTranslations } from 'next-intl/server';

import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';

import { getBeltColorHex } from '@/app/[locale]/(public)/ranks/_lib/helpers';
import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getRankGuide } from '../_lib/guideData';
import { RankGuideCard } from './RankGuideCard';

type RankGuidesSectionProps = {
  locale: Locale;
};

/**
 * Hub-top section listing all rank guides that currently have content.
 * Ranks without guide pages are silently skipped.
 */
export async function RankGuidesSection({ locale }: RankGuidesSectionProps) {
  const tGuides = await getTranslations({ locale, namespace: 'guides' });
  const tRanks = await getTranslations({ locale, namespace: 'ranks' });

  const guidesPages = tGuides.raw('pages') as Record<string, unknown>;

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <SectionTitle>{tGuides('top.sections.rankGuides.title')}</SectionTitle>
        <p className="text-muted-foreground">{tGuides('top.sections.rankGuides.description')}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ALL_RANK_SLUGS.map((slug) => {
          const guide = getRankGuide(guidesPages, slug);
          if (!guide) return null;
          const rankName = tRanks(`rankNames.${slug}`);
          return (
            <RankGuideCard
              key={slug}
              href={`/${locale}/guides/ranks/${slug}`}
              rankName={rankName}
              beltColor={getBeltColorHex(slug)}
            />
          );
        })}
      </div>
    </section>
  );
}
