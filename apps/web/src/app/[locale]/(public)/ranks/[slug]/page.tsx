/**
 * Rank Detail Page
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
import { buildGuidePath, getRankGuide, paragraphToPlainText } from '@/lib/guides';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { AnchorPointsBoard } from '../_components/AnchorPointsBoard';
import { CoordinateBoard } from '../_components/CoordinateBoard';
import { DiagonalBoard } from '../_components/DiagonalBoard';
import { GuideLinkCard } from '../_components/GuideLinkCard';
import { KingMovementBoard } from '../_components/KingMovementBoard';
import { PawnBreakthroughBoard } from '../_components/PawnBreakthroughBoard';
import { RankAchievedBadge } from '../_components/RankAchievedBadge';
import { RankHeader } from '../_components/RankHeader';
import { RequirementsList } from '../_components/RequirementsList';
import { ScatteredPawnsBoard } from '../_components/ScatteredPawnsBoard';
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
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function RankDetailPage({ params }: Props) {
  const { locale, slug } = await params;

  const t = await getTranslations({ locale, namespace: 'ranks' });

  const tGuides = await getTranslations({ locale, namespace: 'guides' });
  const guidesPages = tGuides.raw('pages') as Record<string, unknown>;

  // Extract a short teaser paragraph for the "tips" card, if the rank has a
  // flat guide. Chaptered guides have no single top-level teaser, so we render
  // the tips card without a preview paragraph.
  const getTeaserParagraph = (rankKey: string): string => {
    const guide = getRankGuide(guidesPages, rankKey as RankSlug);
    if (!guide || guide.format !== 'flat') return '';
    const first = guide.pages[0]?.paragraphs[0];
    return first === undefined ? '' : paragraphToPlainText(first);
  };
  const hasGuideFor = (rankKey: string): boolean =>
    getRankGuide(guidesPages, rankKey as RankSlug) !== null;

  // -----------------------------------------------------------------------
  // Mukyu (無級) — UI-only rank, not stored in DB.
  // Renders a dedicated detail page with criteria, tips, and requirements
  // sourced entirely from i18n, bypassing the DB validation path.
  // -----------------------------------------------------------------------
  if (isMukyuSlug(slug)) {
    const beltColor = getBeltColorHex(slug);
    const rankName = t(`rankNames.${slug}`);
    const mukyuRequirements = t.raw('detail.mukyuRequirements') as string[];
    const mukyuRelatedLinks = t.raw('detail.mukyuRelatedLinks') as {
      learnArticle: string;
      practiceLink: string;
      learnArticleLabel: string;
      practiceLabel: string;
    };

    const hasGuide = hasGuideFor(slug);
    const firstFlatParagraph = getTeaserParagraph(slug);

    return (
      <PageLayout
        title={rankName}
        locale={locale}
        breadcrumb={[{ label: t('pageTitle'), href: '/ranks' }, { label: rankName }]}
      >
        <RankHeader
          beltColor={beltColor}
          trailing={<RankAchievedBadge slug={slug} label={t('detail.achieved')} />}
        >
          {t('requirements')}
        </RankHeader>

        {/* Criteria description */}
        <SectionTitle>{t('detail.criteria')}</SectionTitle>
        <p className="mt-2 text-foreground/80">{t(`detail.criteriaDescriptions.${slug}`)}</p>

        {/* Tips callout card with CoordinateBoard visual aid */}
        {hasGuide && (
          <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-950/20">
            <p className="font-semibold text-foreground">💡 {t('detail.tips')}</p>
            <p className="mt-2 text-foreground/80">
              {firstFlatParagraph.length > 100
                ? `${firstFlatParagraph.slice(0, 100)}…`
                : firstFlatParagraph}
            </p>
            <Link
              href={buildGuidePath(locale, slug, { kind: 'root' })}
              className="mt-3 block"
              aria-label={t('detail.readFullGuide', { rankName })}
            >
              <CoordinateBoard className="mx-auto max-w-[10rem]" />
              <span className="mt-2 block text-sm text-amber-600 hover:underline dark:text-amber-400">
                {t('detail.readFullGuide', { rankName })}
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
          <p className="text-foreground/80">{mukyuRelatedLinks.learnArticle}</p>
          <GuideLinkCard
            items={[
              {
                label: mukyuRelatedLinks.learnArticleLabel,
                href: `/${locale}/learn/notation/algebraic-notation`,
              },
            ]}
          />
          <p className="text-foreground/80">{mukyuRelatedLinks.practiceLink}</p>
          <GuideLinkCard
            items={[
              {
                label: mukyuRelatedLinks.practiceLabel,
                href: `/${locale}/practice/algebraic-notation`,
              },
            ]}
          />
        </div>

        <AdSlot slot="content-bottom" />
      </PageLayout>
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
  const hasGuide = hasGuideFor(rankSlug);
  const firstDbGuideParagraph = getTeaserParagraph(rankSlug);

  return (
    <PageLayout
      title={rankName}
      locale={locale}
      breadcrumb={[{ label: t('pageTitle'), href: '/ranks' }, { label: rankName }]}
    >
      <RankHeader
        beltColor={beltColor}
        trailing={<RankAchievedBadge slug={rankSlug} label={t('detail.achieved')} />}
      >
        {t('requirements')}
      </RankHeader>

      {/* Criteria description (only if available for this slug) */}
      {hasCriteriaDescription && (
        <>
          <SectionTitle>{t('detail.criteria')}</SectionTitle>
          <p className="mt-2 text-foreground/80">{t(`detail.criteriaDescriptions.${rankSlug}`)}</p>
        </>
      )}

      {/* Benefits — dan-tier only (ad-free entitlement). Hardcoded to 1dan
          rather than driven by rank data: today only 1dan carries a
          benefit, and `hasDanTierRank` is intentionally derived from
          `user_ranks`, not materialized — see the User Grants System notes
          in CLAUDE.md. Add a data-driven benefits list if a second rank
          ever needs one. */}
      {rankSlug === '1dan' && (
        <>
          <SectionTitle>{t('detail.benefits')}</SectionTitle>
          <p className="mt-2 text-foreground/80">{t('detail.benefitsAdFree')}</p>
        </>
      )}

      {/* Tips callout card (only if available for this slug) */}
      {hasGuide && (
        <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-950/20">
          <p className="font-semibold text-foreground">💡 {t('detail.tips')}</p>
          <p className="mt-2 text-foreground/80">
            {firstDbGuideParagraph.length > 100
              ? `${firstDbGuideParagraph.slice(0, 100)}…`
              : firstDbGuideParagraph}
          </p>
          <Link
            href={buildGuidePath(locale, rankSlug, { kind: 'root' })}
            className="mt-3 block"
            aria-label={t('detail.readFullGuide', { rankName })}
          >
            {rankSlug === '4kyu' ? (
              <KingMovementBoard className="mx-auto max-w-[10rem]" />
            ) : rankSlug === '3kyu' ? (
              <DiagonalBoard className="mx-auto max-w-[10rem]" />
            ) : rankSlug === '2kyu' ? (
              <ScatteredPawnsBoard className="mx-auto max-w-[10rem]" />
            ) : rankSlug === '1kyu' ? (
              <PawnBreakthroughBoard className="mx-auto max-w-[10rem]" />
            ) : (
              <AnchorPointsBoard className="mx-auto max-w-[10rem]" />
            )}
            <span className="mt-2 block text-sm text-amber-600 hover:underline dark:text-amber-400">
              {t('detail.readFullGuide', { rankName })}
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

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
