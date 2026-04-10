import React from 'react';

import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ALL_RANK_SLUGS, isMukyuSlug } from '@/lib/db/data/ranks';
import type { ChallengeScoreRequirement, RankSlug } from '@/lib/db/data/ranks';
import { buildChapterHref, buildFlatHref, findChapter, getRankGuide } from '@/lib/guides';
import type { ChapteredGuide, GuideChapter, GuidePage } from '@/lib/guides';

import { GuidePageFooter } from '@/app/[locale]/(public)/guides/_components/GuidePageFooter';
import { GuideLinkCard } from '@/app/[locale]/(public)/ranks/_components/GuideLinkCard';
import { RankHeader } from '@/app/[locale]/(public)/ranks/_components/RankHeader';
import { RequirementsList } from '@/app/[locale]/(public)/ranks/_components/RequirementsList';
import { buildRequirementItems, getBeltColorHex } from '@/app/[locale]/(public)/ranks/_lib/helpers';
import { getValidatedRank } from '@/app/[locale]/(public)/ranks/_lib/queries';
import {
  Divider,
  PagePanel,
  PageTitle,
  PaginationNav,
  SectionTitle,
} from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getGuideInlineLink } from './guideLinkConfig';
import { getVisualAid } from './visualAidConfig';

type BaseProps = {
  locale: Locale;
  slug: string;
};

type FlatBodyProps = BaseProps & {
  kind: 'flat';
  pageNumber: number;
};

type ChapterListProps = BaseProps & {
  kind: 'chapter-list';
};

type ChapterBodyProps = BaseProps & {
  kind: 'chapter-body';
  chapterSlug: string;
  pageNumber: number;
};

export type GuideBodyProps = FlatBodyProps | ChapterListProps | ChapterBodyProps;

/**
 * Render a single page of paragraphs with visual aids and inline links.
 */
function renderPageParagraphs({
  rankSlug,
  pageNumber,
  page,
  tGuides,
  locale,
}: {
  rankSlug: RankSlug;
  pageNumber: number;
  page: GuidePage;
  tGuides: (key: string) => string;
  locale: string;
}) {
  return (
    <div className="space-y-4">
      {page.paragraphs.map((paragraph, i) => {
        const linkInfo = getGuideInlineLink(rankSlug, pageNumber, i, locale, tGuides);
        return (
          <React.Fragment key={i}>
            {paragraph.includes('\n') ? (
              <p className="text-foreground/80">
                <strong className="block">{paragraph.split('\n')[0]}</strong>
                {paragraph.split('\n').slice(1).join('\n')}
              </p>
            ) : (
              <p className="text-foreground/80">{paragraph}</p>
            )}
            {getVisualAid(rankSlug, pageNumber, i)}
            {linkInfo && (
              <>
                {linkInfo.leadIn && <p className="text-foreground/80">{linkInfo.leadIn}</p>}
                <GuideLinkCard items={[{ label: linkInfo.label, href: linkInfo.href }]} />
              </>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Shared renderer for all /guides/ranks/[rank]/... layers (flat body,
 * chapter list, chapter body). Handles rank validation, translation lookup,
 * pagination, breadcrumbs, and practice links on the last page.
 */
export async function renderGuideBody(props: GuideBodyProps) {
  const { locale, slug } = props;

  // Rank slug validation (covers mukyu + DB-backed ranks uniformly)
  const isValidSlug = (ALL_RANK_SLUGS as readonly string[]).includes(slug);
  if (!isValidSlug) notFound();
  const rankSlug = slug as RankSlug;

  const tRanks = await getTranslations({ locale, namespace: 'ranks' });
  const tGuides = await getTranslations({ locale, namespace: 'guides' });

  const guidesPages = tGuides.raw('pages') as Record<string, unknown>;
  const guide = getRankGuide(guidesPages, rankSlug);
  if (!guide) notFound();

  // For DB-backed ranks, resolve requirements so the last page can show CTAs.
  let requirements: ChallengeScoreRequirement[] = [];
  if (!isMukyuSlug(rankSlug)) {
    const result = await getValidatedRank(rankSlug);
    if (!result) notFound();
    requirements = result.requirements;
  }

  const rankName = tRanks(`rankNames.${rankSlug}`);
  const beltColor = getBeltColorHex(rankSlug);

  // ---------------------------------------------------------------------
  // Chapter list page (chaptered guide, no segments)
  // ---------------------------------------------------------------------
  if (props.kind === 'chapter-list') {
    if (guide.format !== 'chaptered') {
      // Flat rank at root is handled by 'flat' branch below; shouldn't reach here.
      notFound();
    }

    return (
      <div className="space-y-8">
        <PageTitle>{rankName}</PageTitle>

        <PagePanel>
          <RankHeader beltColor={beltColor}>{tGuides('ranks.indexTitle')}</RankHeader>

          <SectionTitle>{tGuides('ranks.chapterListHeading')}</SectionTitle>
          <ul className="mt-4 space-y-3">
            {guide.chapters.map((chapter) => (
              <li key={chapter.slug}>
                <GuideLinkCard
                  items={[
                    {
                      label: chapter.title,
                      href: buildChapterHref(locale, rankSlug, chapter.slug, 1),
                      description: chapter.description,
                    },
                  ]}
                />
              </li>
            ))}
          </ul>

          <GuidePageFooter
            locale={locale}
            items={[{ label: tGuides('breadcrumb.guides'), href: '/guides' }, { label: rankName }]}
          />
        </PagePanel>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Flat body page
  // ---------------------------------------------------------------------
  if (props.kind === 'flat') {
    if (guide.format !== 'flat') notFound();
    const { pageNumber } = props;
    const pages = guide.pages;
    if (pageNumber > pages.length) notFound();

    const currentPage = pages[pageNumber - 1];
    const isLastPage = pageNumber === pages.length;

    return (
      <div className="space-y-8">
        <PageTitle>{rankName}</PageTitle>

        <PagePanel>
          <RankHeader beltColor={beltColor}>{tGuides('ranks.indexTitle')}</RankHeader>

          {renderPageParagraphs({ rankSlug, pageNumber, page: currentPage, tGuides, locale })}

          {isLastPage && !isMukyuSlug(rankSlug) && (
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

          {pages.length > 1 && (
            <>
              <Divider />
              <PaginationNav
                currentPage={pageNumber}
                totalPages={pages.length}
                buildHref={(p) => buildFlatHref(locale, rankSlug, p)}
              />
            </>
          )}

          <GuidePageFooter
            locale={locale}
            items={[
              { label: tGuides('breadcrumb.guides'), href: '/guides' },
              { label: rankName, href: `/guides/ranks/${rankSlug}` },
              ...(pageNumber > 1
                ? [{ label: tRanks('detail.pageOf', { current: pageNumber, total: pages.length }) }]
                : []),
            ]}
          />
        </PagePanel>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Chapter body page
  // ---------------------------------------------------------------------
  if (guide.format !== 'chaptered') notFound();
  const chapteredGuide: ChapteredGuide = guide;
  const { chapterSlug, pageNumber } = props;

  const chapter: GuideChapter | null = findChapter(chapteredGuide, chapterSlug);
  if (!chapter) notFound();
  if (pageNumber > chapter.pages.length) notFound();

  const currentPage = chapter.pages[pageNumber - 1];

  return (
    <div className="space-y-8">
      <PageTitle>{rankName}</PageTitle>

      <PagePanel>
        <RankHeader beltColor={beltColor}>{chapter.title}</RankHeader>

        {renderPageParagraphs({ rankSlug, pageNumber, page: currentPage, tGuides, locale })}

        {chapter.pages.length > 1 && (
          <>
            <Divider />
            <PaginationNav
              currentPage={pageNumber}
              totalPages={chapter.pages.length}
              buildHref={(p) => buildChapterHref(locale, rankSlug, chapterSlug, p)}
            />
          </>
        )}

        <GuidePageFooter
          locale={locale}
          items={[
            { label: tGuides('breadcrumb.guides'), href: '/guides' },
            { label: rankName, href: `/guides/ranks/${rankSlug}` },
            { label: chapter.title, href: `/guides/ranks/${rankSlug}/${chapterSlug}` },
            ...(pageNumber > 1
              ? [
                  {
                    label: tRanks('detail.pageOf', {
                      current: pageNumber,
                      total: chapter.pages.length,
                    }),
                  },
                ]
              : []),
          ]}
        />
      </PagePanel>
    </div>
  );
}
