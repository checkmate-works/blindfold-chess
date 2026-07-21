import type { ReactNode } from 'react';

import { notFound } from 'next/navigation';

import { isMukyuSlug } from '@/lib/db/data/ranks';
import type { RankRequirement, RankSlug } from '@/lib/db/data/ranks';
import { buildFlatHref } from '@/lib/guides';
import type { FlatGuide } from '@/lib/guides';
import { JsonLd } from '@/lib/seo/jsonld';

import { GuidePageFooter } from '@/app/[locale]/(public)/dojo/guides/_components/GuidePageFooter';
import { RankHeader } from '@/app/[locale]/(public)/dojo/ranks/_components/RankHeader';
import { RequirementsList } from '@/app/[locale]/(public)/dojo/ranks/_components/RequirementsList';
import { buildRequirementItems } from '@/app/[locale]/(public)/dojo/ranks/_lib/helpers';
import { Divider, PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { buildFlatBodyBreadcrumbs, buildFlatBodyLearningResourceSchema } from '../guide-metadata';
import { RankNavigation } from './RankNavigation';
import type { GuideContext } from './context';
import { renderPageParagraphs } from './renderParagraph';

type FlatBodyProps = {
  kind: 'flat';
  locale: Locale;
  slug: RankSlug;
  pageNumber: number;
};

export async function renderFlatBody(
  ctx: GuideContext,
  guide: FlatGuide,
  props: FlatBodyProps,
  requirements: RankRequirement[]
): Promise<ReactNode> {
  const { locale, rankSlug, rankName, beltColor, tRanks, tGuides, nonce } = ctx;
  const { pageNumber } = props;

  const pages = guide.pages;
  if (pageNumber > pages.length) notFound();

  const currentPage = pages[pageNumber - 1];
  const isLastPage = pageNumber === pages.length;
  // Suppress the CTA when there are no requirements to surface — happens for
  // mukyu (UI-only) and for ranks whose gating conditions are still in draft
  // (`requirements: []` in seed data). The guide itself stays reachable.
  const showChallengeCta = isLastPage && !isMukyuSlug(rankSlug) && requirements.length > 0;
  const showPagination = pages.length > 1;

  const breadcrumbItems = buildFlatBodyBreadcrumbs(
    tGuides,
    tRanks,
    rankSlug,
    rankName,
    pageNumber,
    pages.length
  );

  const learningResourceSchema = await buildFlatBodyLearningResourceSchema({
    locale,
    rankSlug,
    rankName,
    pageNumber,
    totalPages: pages.length,
  });

  // Rank-linked guide heading, e.g. "Guide for 5th Kyū" with the rank name
  // itself linking to the rank detail page. Every rank reaching this
  // renderer has guide content, and every guide-content rank (including
  // mukyu) has a corresponding `/dojo/ranks/[slug]` page, so this needs no
  // per-rank gating.
  const guideHeaderLabel = tGuides.rich('ranks.indexTitleWithRank', {
    rankName,
    link: (chunks) => (
      <a href={`/${locale}/dojo/ranks/${rankSlug}`} className={TEXT_LINK_CLASSES}>
        {chunks}
      </a>
    ),
  });

  return (
    <>
      <JsonLd data={learningResourceSchema} nonce={nonce} />
      <PageLayout title={rankName} locale={locale}>
        <RankHeader beltColor={beltColor}>{guideHeaderLabel}</RankHeader>

        {renderPageParagraphs({ rankSlug, pageNumber, page: currentPage, tGuides, locale })}

        {showChallengeCta && (
          <>
            <Divider />
            <SectionTitle>{tRanks('detail.tryChallenge')}</SectionTitle>
            <RequirementsList
              className="mt-4 space-y-3"
              iconSize="size-5"
              textSize="text-base"
              items={buildRequirementItems(requirements, locale, tRanks)}
            />
          </>
        )}

        {showPagination && (
          <>
            <Divider />
            <PaginationNav
              locale={locale}
              currentPage={pageNumber}
              totalPages={pages.length}
              buildHref={(p) => buildFlatHref(locale, rankSlug, p)}
            />
          </>
        )}

        {isLastPage && <RankNavigation ctx={ctx} />}

        {/* Reciprocal link over to the rank detail page — ranks/[slug]
            already links back via TipsCard's "read full guide" button; this
            is the other direction. 1dan has no guide content, so it never
            reaches this renderer and needs no special-casing here. */}
        {isLastPage && (
          <div className="flex justify-center">
            <a
              href={`/${locale}/dojo/ranks/${rankSlug}`}
              className={`text-sm ${TEXT_LINK_CLASSES}`}
            >
              {tGuides('viewRankPage', { rankName })}
            </a>
          </div>
        )}

        <GuidePageFooter locale={locale} items={breadcrumbItems} />
      </PageLayout>
    </>
  );
}

export type { FlatBodyProps };
