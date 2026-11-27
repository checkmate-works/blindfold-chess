import { getTranslations } from 'next-intl/server';

import type { ExamPattern } from '@blindfold-chess/features/dojo-journey';

import { RelatedTags } from '@/app/[locale]/_components/RelatedTags';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  patterns: readonly ExamPattern[];
  locale: Locale;
  /** The detail-page namespace whose `usefulSection` heads the list. */
  detailNamespace: 'practice.positionMemory.detail' | 'practice.puzzle.detail';
};

/**
 * An exam problem's patterns, in the same collapsible list a saved problem's
 * detail page uses for its tagged chunks. The patterns are constants of the
 * exam, not rows in `chunks`, so they have no chunk page and render as
 * static cards.
 */
export async function ExamPatterns({ patterns, locale, detailNamespace }: Props) {
  const t = await getTranslations({ locale });
  return (
    <RelatedTags
      themes={[]}
      chunks={patterns.map((pattern) => ({
        id: pattern.key,
        // dojoExam.patterns.<ExamPatternKey>
        title: t(`dojoExam.patterns.${pattern.key}.title`),
        description: t(`dojoExam.patterns.${pattern.key}.description`),
        representativeFen: pattern.fen,
      }))}
      locale={locale}
      labels={{
        sectionTitle: (count) => t(`${detailNamespace}.usefulSection`, { count }),
        badgeTheme: t('practice.tags.badge.theme'),
        badgeChunk: t('practice.tags.badge.chunk'),
      }}
    />
  );
}
