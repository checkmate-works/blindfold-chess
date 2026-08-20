import { getTranslations } from 'next-intl/server';

import { buildGuideHrefBySlug } from '@/lib/guides/guideHrefBySlug';

import { CurriculumToc, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

type RankGuidesSectionProps = {
  locale: Locale;
};

/**
 * Hub-top section listing the full rank curriculum as a Zenn-style table
 * of contents. Reuses the shared `CurriculumToc` component in plain mode:
 * no user-dependent data (no achievement marks, no next-rank highlight,
 * no truncation), so the page stays SSR-friendly and public. Ranks with no
 * curriculum yet are omitted by the component itself — nothing here or in
 * Dojo advertises an empty "coming soon" entry.
 */
export async function RankGuidesSection({ locale }: RankGuidesSectionProps) {
  const tGuides = await getTranslations({ locale, namespace: 'guides' });
  const tRanks = await getTranslations({ locale, namespace: 'ranks' });
  const tDojo = await getTranslations({ locale, namespace: 'dojo' });

  const guidesPages = tGuides.raw('pages') as Record<string, unknown>;

  const guideHrefBySlug = buildGuideHrefBySlug(locale, guidesPages);

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <SectionTitle>{tGuides('top.sections.rankGuides.title')}</SectionTitle>
        <p className="text-muted-foreground">{tGuides('top.sections.rankGuides.description')}</p>
      </div>

      <CurriculumToc
        rankName={(slug) => tRanks(`rankNames.${slug}`)}
        sectionTitle={(key) => tDojo(`curriculum.sections.${key}`)}
        achievedLabel={tDojo('curriculum.achieved')}
        guideHrefBySlug={guideHrefBySlug}
      />
    </section>
  );
}
