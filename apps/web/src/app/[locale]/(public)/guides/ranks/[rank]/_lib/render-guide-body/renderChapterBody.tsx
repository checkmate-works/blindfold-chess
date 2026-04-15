import type { ReactNode } from 'react';

import { notFound } from 'next/navigation';

import type { ChallengeScoreRequirement, RankSlug } from '@/lib/db/data/ranks';
import { buildChapterHref, findChapter } from '@/lib/guides';
import type { ChapteredGuide } from '@/lib/guides';
import { JsonLd } from '@/lib/seo/jsonld';

import { GuidePageFooter } from '@/app/[locale]/(public)/guides/_components/GuidePageFooter';
import { RankHeader } from '@/app/[locale]/(public)/ranks/_components/RankHeader';
import { Divider, PagePanel, PageTitle, PaginationNav } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import {
  buildChapterBodyBreadcrumbs,
  buildChapterBodyLearningResourceSchema,
} from '../guide-metadata';
import { RankNavigation } from './RankNavigation';
import type { GuideContext } from './context';
import { renderPageParagraphs } from './renderParagraph';

type ChapterBodyProps = {
  kind: 'chapter-body';
  locale: Locale;
  slug: RankSlug;
  chapterSlug: string;
  pageNumber: number;
};

export async function renderChapterBody(
  ctx: GuideContext,
  guide: ChapteredGuide,
  props: ChapterBodyProps,
  _requirements: ChallengeScoreRequirement[]
): Promise<ReactNode> {
  // `_requirements` is accepted for symmetry with `renderFlatBody` and to
  // leave the door open for a chapter-last-page CTA later. Currently unused.
  void _requirements;

  const { locale, rankSlug, rankName, beltColor, tRanks, tGuides } = ctx;
  const { chapterSlug, pageNumber } = props;

  const chapter = findChapter(guide, chapterSlug);
  if (!chapter) notFound();
  if (pageNumber > chapter.pages.length) notFound();

  const currentPage = chapter.pages[pageNumber - 1];
  const showPagination = chapter.pages.length > 1;
  // "Last reachable page of this rank's guide" — only true on the final
  // page of the final chapter. Lower-walks the same termination semantics
  // as `renderFlatBody::isLastPage`.
  const isLastChapter = guide.chapters[guide.chapters.length - 1]?.slug === chapter.slug;
  const isLastPageOfRank = isLastChapter && pageNumber === chapter.pages.length;

  const breadcrumbItems = buildChapterBodyBreadcrumbs(
    tGuides,
    tRanks,
    rankSlug,
    rankName,
    chapterSlug,
    chapter.title,
    pageNumber,
    chapter.pages.length
  );

  const learningResourceSchema = await buildChapterBodyLearningResourceSchema({
    locale,
    rankSlug,
    rankName,
    chapterSlug,
    chapterTitle: chapter.title,
    pageNumber,
    totalPages: chapter.pages.length,
  });

  return (
    <div className="space-y-8">
      <JsonLd data={learningResourceSchema} />

      <PageTitle>{rankName}</PageTitle>

      <PagePanel>
        <RankHeader beltColor={beltColor}>{chapter.title}</RankHeader>

        {renderPageParagraphs({ rankSlug, pageNumber, page: currentPage, tGuides, locale })}

        {showPagination && (
          <>
            <Divider />
            <PaginationNav
              currentPage={pageNumber}
              totalPages={chapter.pages.length}
              buildHref={(p) => buildChapterHref(locale, rankSlug, chapterSlug, p)}
            />
          </>
        )}

        {isLastPageOfRank && <RankNavigation ctx={ctx} />}

        <GuidePageFooter locale={locale} items={breadcrumbItems} />
      </PagePanel>
    </div>
  );
}

export type { ChapterBodyProps };
