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
 *    Exception: Mukyu (無級) is UI-only and bypasses the DB lookup entirely.
 * 3. Render belt color bar, rank name, criteria, and score requirements.
 *    Each score requirement includes an inline "Challenge" link to the
 *    corresponding practice page (`/practice/{menuType}`).
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';

import { ALL_RANK_SLUGS, isMukyuSlug } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { AnchorPointsBoard } from '../_components/AnchorPointsBoard';
import { CoordinateBoard } from '../_components/CoordinateBoard';
import { GuideLinkCard } from '../_components/GuideLinkCard';
import { KingMovementBoard } from '../_components/KingMovementBoard';
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

  const title = t('title', { rankName });
  const description = t('description', { rankName });

  return {
    ...generateCanonicalMetadata({ locale, path: `ranks/${slug}`, title, description }),
    title,
    description,
  };
}

export default async function RankDetailPage({ params }: Props) {
  const { locale, slug } = await params;

  const t = await getTranslations({ locale, namespace: 'ranks' });

  // -----------------------------------------------------------------------
  // Mukyu (無級) — UI-only rank, not stored in DB.
  // Renders a dedicated detail page with criteria, tips, and requirements
  // sourced entirely from i18n, bypassing the DB validation path.
  // -----------------------------------------------------------------------
  if (isMukyuSlug(slug)) {
    const beltColor = getBeltColorHex(slug);
    const rankName = t(`rankNames.${slug}`);
    const mukyuRequirements = t.raw('detail.mukyuRequirements') as string[];
    const mukyuGuideLinks = t.raw('detail.mukyuGuideLinks') as {
      learnArticle: string;
      practiceLink: string;
      learnArticleLabel: string;
      practiceLabel: string;
    };

    // Check for guide pages
    const guidePages = t.raw('detail.guidePages') as Record<
      string,
      Array<{ paragraphs: string[] }>
    >;
    const hasGuide = slug in guidePages;

    return (
      <div className="space-y-8">
        <PageTitle>{rankName}</PageTitle>

        <PagePanel>
          <RankHeader beltColor={beltColor}>{t('requirements')}</RankHeader>

          {/* Criteria description */}
          <SectionTitle>{t('detail.criteria')}</SectionTitle>
          <p className="mt-2 text-foreground/80">{t(`detail.criteriaDescriptions.${slug}`)}</p>

          {/* Tips callout card with CoordinateBoard visual aid */}
          {hasGuide && (
            <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-950/20">
              <p className="font-semibold text-foreground">💡 {t('detail.tips')}</p>
              <p className="mt-2 text-foreground/80">
                {guidePages[slug][0].paragraphs[0].length > 100
                  ? `${guidePages[slug][0].paragraphs[0].slice(0, 100)}…`
                  : guidePages[slug][0].paragraphs[0]}
              </p>
              <Link href={`/${locale}/ranks/${slug}/guide`} className="mt-3 block">
                <CoordinateBoard className="mx-auto max-w-[10rem]" />
                <span className="mt-2 block text-sm text-amber-600 hover:underline dark:text-amber-400">
                  {t('detail.showMore')}
                </span>
              </Link>
            </div>
          )}

          {/* Requirements */}
          <SectionTitle>{t('detail.requirements')}</SectionTitle>
          <RequirementsList
            className="mt-4 space-y-3"
            iconSize="size-5"
            textSize="text-base"
            items={mukyuRequirements}
          />

          {/* Related links */}
          <div className="mt-6 space-y-3">
            <p className="text-foreground/80">{mukyuGuideLinks.learnArticle}</p>
            <GuideLinkCard
              items={[
                {
                  label: mukyuGuideLinks.learnArticleLabel,
                  href: `/${locale}/learn/notation/algebraic-notation`,
                },
              ]}
            />
            <p className="text-foreground/80">{mukyuGuideLinks.practiceLink}</p>
            <GuideLinkCard
              items={[
                {
                  label: mukyuGuideLinks.practiceLabel,
                  href: `/${locale}/practice/algebraic-notation`,
                },
              ]}
            />
          </div>

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

  // -----------------------------------------------------------------------
  // Standard ranks (5kyū–1dan) — DB-backed with challenge score requirements
  // -----------------------------------------------------------------------
  const result = await getValidatedRank(slug);
  if (!result) notFound();
  const { rankSlug, requirements } = result;

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
            <Link href={`/${locale}/ranks/${rankSlug}/guide`} className="mt-3 block">
              {rankSlug === '4kyu' ? (
                <KingMovementBoard className="mx-auto max-w-[10rem]" />
              ) : (
                <AnchorPointsBoard className="mx-auto max-w-[10rem]" />
              )}
              <span className="mt-2 block text-sm text-amber-600 hover:underline dark:text-amber-400">
                {t('detail.showMore')}
              </span>
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
