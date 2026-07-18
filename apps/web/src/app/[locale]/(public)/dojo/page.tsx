/**
 * Dojo (道場 — "training hall")
 *
 * @description
 * Single-page view of the user's current belt rank, the requirements for the
 * next rank, and a per-rank curriculum table of contents. Reuses the ranks
 * system primitives (belt colors, RankCard) but focuses on the single "what
 * should I do next?" question instead of listing every rank. Public page —
 * unauthenticated users see the unranked (mukyu / white belt) state.
 *
 * @flow
 * 1. Fetch all ranks and the current user's achieved ranks.
 * 2. Resolve the current and next rank via `resolveNextRank`.
 * 3. Render: belt strip (current), next rank RankCard + action links,
 *    curriculum TOC accordion.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { CURRICULUM } from '@/lib/db/data/curriculum';
import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';
import { buildGuidePath, getRankGuide } from '@/lib/guides';
import { createClient } from '@/lib/supabase/server';

import { RankCard } from '@/app/[locale]/(public)/ranks/_components/RankCard';
import {
  buildRequirementItems,
  buildRequirementLabels,
  getBeltColorHex,
  isRankEarnedByPlaying,
  resolveAchievedSlugs,
  resolveNextRank,
} from '@/app/[locale]/(public)/ranks/_lib/helpers';
import { getAllRanks, getUserAchievedRankIds } from '@/app/[locale]/(public)/ranks/_lib/queries';
import {
  CurriculumToc,
  HelpTourButton,
  PageLayout,
  SectionTitle,
} from '@/app/[locale]/_components';
import type { HelpStep } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

import { BeltStrip } from './_components/BeltStrip';
import { NextRankRequirements } from './_components/NextRankRequirements';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'metadata.dojo', path: 'dojo' });
}

export default async function DojoPage({ params }: LocalePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dojo' });
  const tHelp = await getTranslations({ locale, namespace: 'dojo.help' });
  const tRanks = await getTranslations({ locale, namespace: 'ranks' });
  const tGuides = await getTranslations({ locale, namespace: 'guides' });
  const guidesPages = tGuides.raw('pages') as Record<string, unknown>;

  // Precompute per-rank guide hrefs for the curriculum list. Ranks without a
  // guide entry map to `null` so `CurriculumToc` can render them as disabled.
  const guideHrefBySlug: Partial<Record<RankSlug, string | null>> = {};
  for (const slug of ALL_RANK_SLUGS) {
    guideHrefBySlug[slug] = getRankGuide(guidesPages, slug)
      ? buildGuidePath(locale, slug, { kind: 'root' })
      : null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dbRanks = await getAllRanks();
  const achievedRankIds = user ? await getUserAchievedRankIds(user.id) : new Set<string>();
  const achievedSlugs = resolveAchievedSlugs(dbRanks, achievedRankIds);

  const { current, next } = resolveNextRank(dbRanks, achievedSlugs);

  // Belt strip: current rank view, defaulting to mukyu (white belt) for
  // unauthenticated users or users who have not yet earned any rank.
  const beltSlug: RankSlug = current?.slug ?? 'mukyu';
  const beltLabel = tRanks(`rankNames.${beltSlug}`);

  // RankCard props for the next rank (if any). Requirements are rendered as
  // standalone links beneath the card (not inside it), so `hideRequirements`
  // is set to keep the card focused on the rank identity.
  const nextCardProps = next
    ? {
        slug: next.slug,
        locale,
        beltColor: getBeltColorHex(next.slug),
        rankName: tRanks(`rankNames.${next.slug}`),
        state: (next.requirements.length === 0 ? 'coming-soon' : 'next') as 'next' | 'coming-soon',
        requirementLabels: next.requirements.flatMap((req) => buildRequirementLabels(req, tRanks)),
        requirementsHeading: tRanks('requirements'),
        comingSoonLabel: tRanks('comingSoon'),
        hideRequirements: true,
      }
    : null;

  // Standalone requirement items for the next rank — each renders as a link
  // directly to the relevant practice page (piece parameters already handled
  // by `buildRequirementItems`).
  const nextRequirementItems = next ? buildRequirementItems(next.requirements, locale, tRanks) : [];
  const nextBeltColor = next ? getBeltColorHex(next.slug) : getBeltColorHex('mukyu');

  // Send the reader where the next rank is actually earned — the practice index
  // is a dead end for a rank you earn at the board.
  const nextIsEarnedByPlaying = next !== null && isRankEarnedByPlaying(next.requirements);

  // Curriculum truncation cutoff, and whether it actually hides anything:
  // the "view all guides" link below the TOC is redundant once every rank
  // with curriculum content is already visible (the guides index would show
  // the identical list).
  const maxVisibleSlug = next?.slug ?? ALL_RANK_SLUGS[ALL_RANK_SLUGS.length - 1];
  const maxVisibleIndex = ALL_RANK_SLUGS.indexOf(maxVisibleSlug);
  const hasHiddenCurriculum = CURRICULUM.some(
    ({ slug, sections }) => sections.length > 0 && ALL_RANK_SLUGS.indexOf(slug) > maxVisibleIndex
  );

  const helpSteps: HelpStep[] = [
    {
      targetId: 'dojo-current-rank',
      title: tHelp('overview.title'),
      description: tHelp('overview.description'),
      side: 'bottom',
      align: 'start',
    },
    {
      targetId: 'dojo-next-rank',
      title: tHelp('viewAllRanks.title'),
      description: tHelp('viewAllRanks.description'),
      side: 'top',
      align: 'center',
    },
  ];

  return (
    <PageLayout
      title={t('pageTitle')}
      titleAction={<HelpTourButton steps={helpSteps} label={tHelp('label')} />}
      locale={locale}
      breadcrumb={[{ label: t('pageTitle') }]}
    >
      {/* Section 1: Current rank belt */}
      <section className="space-y-3" data-tour-id="dojo-current-rank">
        <SectionTitle>{t('currentRankTitle')}</SectionTitle>
        <BeltStrip slug={beltSlug} rankName={beltLabel} />
      </section>

      {/* Section 2: Next rank */}
      <section
        className="mt-8 space-y-4"
        aria-labelledby="dojo-next-rank-title"
        data-tour-id="dojo-next-rank"
      >
        <h3
          id="dojo-next-rank-title"
          className="mb-0 text-left text-sm font-medium text-muted-foreground"
        >
          {t('nextRankTitle')}
        </h3>

        {nextCardProps ? (
          <>
            <RankCard {...nextCardProps} />

            {/* Centered "View all ranks" link directly below the card */}
            <div className="flex justify-center">
              <Link href={`/${locale}/ranks`} className={`text-sm ${TEXT_LINK_CLASSES}`}>
                {t('viewAllRanks')}
              </Link>
            </div>

            {/* Requirement items — rendered as a Zenn-style flat list
                  (same visual treatment as the curriculum TOC below) so
                  rows are tightly grouped under a single bordered card.
                  Intentionally differs from `/ranks/[slug]`, which keeps
                  the spaced `RequirementsList` look. */}
            <div className="mt-4 space-y-3">
              {nextRequirementItems.length > 0 ? (
                <NextRankRequirements items={nextRequirementItems} beltColor={nextBeltColor} />
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  {t('nextRankRequirementsComingSoon')}
                </p>
              )}

              {/* Centered CTA directly below the list — the practice index, or
                  the game setup once the next rank is earned by playing. */}
              <div className="flex justify-center">
                <Link
                  href={nextIsEarnedByPlaying ? `/${locale}/games/new` : `/${locale}/practice`}
                  className={`text-sm ${TEXT_LINK_CLASSES}`}
                >
                  {nextIsEarnedByPlaying ? t('startAiGame') : t('viewAllPractices')}
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
              <p className="text-foreground">{t('allAchieved')}</p>
            </div>
            <div className="flex justify-center">
              <Link href={`/${locale}/ranks`} className={`text-sm ${TEXT_LINK_CLASSES}`}>
                {t('viewAllRanks')}
              </Link>
            </div>
            <div className="flex justify-center">
              <Link href={`/${locale}/practice`} className={`text-sm ${TEXT_LINK_CLASSES}`}>
                {t('viewAllPractices')}
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Section 3: Curriculum table of contents */}
      <section className="mt-8 space-y-3">
        <SectionTitle>{t('curriculum.title')}</SectionTitle>
        <CurriculumToc
          achievedSlugs={achievedSlugs}
          nextSlug={next?.slug ?? null}
          maxVisibleSlug={maxVisibleSlug}
          rankName={(slug) => tRanks(`rankNames.${slug}`)}
          sectionTitle={(key) => t(`curriculum.sections.${key}`)}
          achievedLabel={t('curriculum.achieved')}
          guideHrefBySlug={guideHrefBySlug}
        />
        {/* "View all guides" only earns its place while the truncation is
            actually hiding curriculum content — for a player far enough along
            (e.g. 1kyu holders, next=1dan) the TOC above already IS the full
            guide list, and the link would open an identical page. */}
        {hasHiddenCurriculum && (
          <div className="flex justify-center">
            <Link href={`/${locale}/guides`} className={`text-sm ${TEXT_LINK_CLASSES}`}>
              {t('viewAllGuides')}
            </Link>
          </div>
        )}
      </section>

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
