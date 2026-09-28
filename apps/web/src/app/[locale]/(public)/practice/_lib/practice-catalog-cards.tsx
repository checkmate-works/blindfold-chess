import { getTranslations } from 'next-intl/server';

import type { PracticeLevelFilterItem } from '@/app/[locale]/(public)/practice/_components/PracticeLevelFilter';
import { PracticeMenuCard } from '@/app/[locale]/(public)/practice/_components/PracticeMenuCard';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getRankSlugForMenuType } from './module-rank-mapping';
import type { PracticeCatalogEntry } from './practice-catalog';
import { PRACTICE_EMOJIS } from './practice-emojis';
import type { PracticeLevel } from './practice-levels';

/** The label of every band, in the reader's locale. */
export async function getPracticeLevelLabels(
  locale: Locale
): Promise<Record<PracticeLevel, string>> {
  const t = await getTranslations({ locale, namespace: 'practice' });
  return {
    beginner: t('levelBeginner'),
    intermediate: t('levelIntermediate'),
    advanced: t('levelAdvanced'),
    expert: t('levelExpert'),
    introduction: t('levelIntroduction'),
  };
}

/**
 * The practice-list card for each entry, rendered on the server, keyed and
 * tagged with its band.
 *
 * Every surface that shows modules as cards draws them through here, so a
 * module looks the same on the practice list as it does anywhere it is
 * offered as a related practice.
 */
export async function buildPracticeCards(
  locale: Locale,
  entries: readonly PracticeCatalogEntry[]
): Promise<PracticeLevelFilterItem[]> {
  const t = await getTranslations({ locale });
  const tRanks = await getTranslations({ locale, namespace: 'ranks' });
  const levelLabels = await getPracticeLevelLabels(locale);

  return entries.map((practice) => {
    const rankSlug = getRankSlugForMenuType(practice.menuType);
    const rankLabel = rankSlug ? tRanks(`rankNames.${rankSlug}`) : null;
    return {
      key: practice.id,
      level: practice.level,
      card: (
        <PracticeMenuCard
          locale={locale}
          href={`/practice/${practice.id}`}
          level={practice.level}
          levelLabel={levelLabels[practice.level]}
          icon={PRACTICE_EMOJIS[practice.menuType]}
          title={t(practice.titleKey)}
          menuType={practice.menuType}
          rank={rankSlug && rankLabel ? { slug: rankSlug, label: rankLabel } : null}
        />
      ),
    };
  });
}
