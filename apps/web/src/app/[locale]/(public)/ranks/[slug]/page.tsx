/**
 * Rank Detail Page (段級位詳細)
 *
 * @description
 * Displays detailed information about a specific belt rank including
 * criteria description and score requirements.
 *
 * @flow
 * 1. Look up the rank by slug from the database.
 * 2. If not found or has no requirements, show not-found.
 * 3. Render belt color bar, rank name, criteria, and score requirements.
 *    Each score requirement includes an inline "Challenge" link to the
 *    corresponding practice page (`/practice/{menuType}`).
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';

import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { RankHeader } from '../_components/RankHeader';
import { RequirementsList } from '../_components/RequirementsList';
import { buildRequirementItems, getBeltColorHex } from '../_lib/helpers';
import { getValidatedRank } from '../_lib/queries';

type Props = {
  params: Promise<{
    locale: Locale;
    slug: string;
  }>;
};

export function generateStaticParams() {
  return SUPPORTED_LOCALES.flatMap((locale) => ALL_RANK_SLUGS.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.rankDetail' });
  const ranksT = await getTranslations({ locale, namespace: 'ranks' });

  const isValidSlug = (ALL_RANK_SLUGS as readonly string[]).includes(slug);
  if (!isValidSlug) return {};

  const rankName = ranksT(`rankNames.${slug as RankSlug}`);

  return {
    ...generateCanonicalMetadata({ locale, path: `ranks/${slug}` }),
    title: t('title', { rankName }),
    description: t('description', { rankName }),
  };
}

export default async function RankDetailPage({ params }: Props) {
  const { locale, slug } = await params;

  const result = await getValidatedRank(slug);
  if (!result) notFound();
  const { rankSlug, requirements } = result;

  const t = await getTranslations({ locale, namespace: 'ranks' });
  const beltColor = getBeltColorHex(rankSlug);
  const rankName = t(`rankNames.${rankSlug}`);

  // Check if a criteria description exists for this slug
  const criteriaDescriptions = t.raw('detail.criteriaDescriptions') as Record<string, string>;
  const hasCriteriaDescription = rankSlug in criteriaDescriptions;

  // Check if guide pages exist for this slug
  const guidePages = t.raw('detail.guidePages') as Record<string, Array<{ paragraphs: string[] }>>;
  const hasGuide = rankSlug in guidePages;

  return (
    <div className="space-y-8">
      <PageTitle>{rankName}</PageTitle>

      <PagePanel>
        <RankHeader beltColor={beltColor}>{t('requirements')}</RankHeader>

        {/* Criteria description (only if available for this slug) */}
        {hasCriteriaDescription && (
          <>
            <SectionTitle>{t('detail.criteria')}</SectionTitle>
            <p className="mt-2 text-foreground/80">
              {t(`detail.criteriaDescriptions.${rankSlug}`)}
            </p>
          </>
        )}

        {/* Tips callout card (only if available for this slug) */}
        {hasGuide && (
          <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-950/20">
            <p className="font-semibold text-foreground">💡 {t('detail.tips')}</p>
            <p className="mt-2 text-foreground/80">
              {guidePages[rankSlug][0].paragraphs[0].length > 100
                ? `${guidePages[rankSlug][0].paragraphs[0].slice(0, 100)}…`
                : guidePages[rankSlug][0].paragraphs[0]}
            </p>
            <Link
              href={`/${locale}/ranks/${rankSlug}/guide`}
              className="mt-3 inline-block text-sm text-amber-600 hover:underline dark:text-amber-400"
            >
              {t('detail.showMore')} →
            </Link>
          </div>
        )}

        {/* Score requirements */}
        <SectionTitle>{t('detail.requirements')}</SectionTitle>
        <RequirementsList
          className="mt-4 space-y-3"
          iconSize="size-5"
          textSize="text-base"
          items={buildRequirementItems(requirements, locale, t)}
        />

        <AdBannerGuard slot="banner-standard" />

        <Divider />

        <Breadcrumb
          items={[{ label: t('pageTitle'), href: '/ranks' }, { label: rankName }]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
