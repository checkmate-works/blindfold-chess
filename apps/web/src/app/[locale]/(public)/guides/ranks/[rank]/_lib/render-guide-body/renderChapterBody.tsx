import type { ReactNode } from 'react';

import { notFound } from 'next/navigation';

import type { RankRequirement, RankSlug } from '@/lib/db/data/ranks';
import { buildChapterHref, findChapter } from '@/lib/guides';
import type { ChapteredGuide } from '@/lib/guides';
import { JsonLd } from '@/lib/seo/jsonld';

import { GuidePageFooter } from '@/app/[locale]/(public)/guides/_components/GuidePageFooter';
import { RankHeader } from '@/app/[locale]/(public)/ranks/_components/RankHeader';
import { Divider, PageLayout } from '@/app/[locale]/_components';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
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
  _requirements: RankRequirement[]
): Promise<ReactNode> {
  // `_requirements` is accepted for symmetry with `renderFlatBody` and to
  // leave the door open for a chapter-last-page CTA later. Currently unused.
  void _requirements;

  const { locale, rankSlug, rankName, beltColor, tRanks, tGuides, nonce } = ctx;
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
    <>
      <JsonLd data={learningResourceSchema} nonce={nonce} />
      <PageLayout title={rankName} locale={locale}>
        <RankHeader beltColor={beltColor}>{chapter.title}</RankHeader>

        {renderPageParagraphs({ rankSlug, pageNumber, page: currentPage, tGuides, locale })}

        {showPagination && (
          <>
            <Divider />
            <PaginationNav
              locale={locale}
              currentPage={pageNumber}
              totalPages={chapter.pages.length}
              buildHref={(p) => buildChapterHref(locale, rankSlug, chapterSlug, p)}
            />
          </>
        )}

        {isLastPageOfRank && <RankNavigation ctx={ctx} />}

        <GuidePageFooter locale={locale} items={breadcrumbItems} />
      </PageLayout>
    </>
  );
}

export type { ChapterBodyProps };
