import type { ReactNode } from 'react';

import { notFound } from 'next/navigation';

import { isMukyuSlug } from '@/lib/db/data/ranks';
import type { ChallengeScoreRequirement, RankSlug } from '@/lib/db/data/ranks';
import { buildFlatHref } from '@/lib/guides';
import type { FlatGuide } from '@/lib/guides';
import { JsonLd } from '@/lib/seo/jsonld';

import { GuidePageFooter } from '@/app/[locale]/(public)/guides/_components/GuidePageFooter';
import { RankHeader } from '@/app/[locale]/(public)/ranks/_components/RankHeader';
import { RequirementsList } from '@/app/[locale]/(public)/ranks/_components/RequirementsList';
import { buildRequirementItems } from '@/app/[locale]/(public)/ranks/_lib/helpers';
import {
  Divider,
  PagePanel,
  PageTitle,
  PaginationNav,
  SectionTitle,
} from '@/app/[locale]/_components';
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
  requirements: ChallengeScoreRequirement[]
): Promise<ReactNode> {
  const { locale, rankSlug, rankName, beltColor, tRanks, tGuides } = ctx;
  const { pageNumber } = props;

  const pages = guide.pages;
  if (pageNumber > pages.length) notFound();

  const currentPage = pages[pageNumber - 1];
  const isLastPage = pageNumber === pages.length;
  const showChallengeCta = isLastPage && !isMukyuSlug(rankSlug);
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

  return (
    <div className="space-y-8">
      <JsonLd data={learningResourceSchema} />

      <PageTitle>{rankName}</PageTitle>

      <PagePanel>
        <RankHeader beltColor={beltColor}>{tGuides('ranks.indexTitle')}</RankHeader>

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
              currentPage={pageNumber}
              totalPages={pages.length}
              buildHref={(p) => buildFlatHref(locale, rankSlug, p)}
            />
          </>
        )}

        {isLastPage && <RankNavigation ctx={ctx} />}

        <GuidePageFooter locale={locale} items={breadcrumbItems} />
      </PagePanel>
    </div>
  );
}

export type { FlatBodyProps };
