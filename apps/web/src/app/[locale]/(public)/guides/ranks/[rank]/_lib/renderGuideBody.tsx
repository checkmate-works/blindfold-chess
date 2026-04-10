import React from 'react';
import type { ReactNode } from 'react';

import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { isMukyuSlug } from '@/lib/db/data/ranks';
import type { ChallengeScoreRequirement, RankSlug } from '@/lib/db/data/ranks';
import {
  buildChapterHref,
  buildFlatHref,
  buildGuidePathRelative,
  findChapter,
  getRankGuide,
} from '@/lib/guides';
import type { ChapteredGuide, FlatGuide, GuidePage, RankGuide } from '@/lib/guides';

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
import type { BreadcrumbItem } from '@/app/[locale]/_components/Breadcrumb';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getGuideInlineLink } from './paragraphInlineLinks';
import { getVisualAid } from './paragraphVisualAids';

// ---------------------------------------------------------------------------
// Public prop shapes
// ---------------------------------------------------------------------------
//
// The route layer (`[rank]/page.tsx` and `[rank]/[...rest]/page.tsx`) has
// already validated the slug against `ALL_RANK_SLUGS` before calling
// `renderGuideBody`, so `slug` is typed as `RankSlug` here — no further
// validation cast is needed. The renderer trusts its input contract.
type BaseProps = {
  locale: Locale;
  slug: RankSlug;
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

// ---------------------------------------------------------------------------
// Shared context
// ---------------------------------------------------------------------------

/**
 * Translator object returned by `next-intl/server`'s `getTranslations`.
 * Narrowing just enough for what the renderers use (label lookup + ICU args).
 */
type Translator = (key: string, values?: Record<string, string | number | Date>) => string;

type GuideContext = {
  locale: Locale;
  rankSlug: RankSlug;
  guide: RankGuide;
  rankName: string;
  beltColor: string;
  tRanks: Translator;
  tGuides: Translator;
};

/**
 * Resolve everything that every layer needs regardless of `kind`: the guide
 * data, the rank name + belt colour, and the two translators. Calling this
 * does NOT touch the database — it is safe to run for the chapter-list layer
 * which skips requirement lookup.
 */
async function resolveGuideContext(locale: Locale, rankSlug: RankSlug): Promise<GuideContext> {
  const tRanks = await getTranslations({ locale, namespace: 'ranks' });
  const tGuides = await getTranslations({ locale, namespace: 'guides' });

  const guidesPages = tGuides.raw('pages') as Record<string, unknown>;
  const guide = getRankGuide(guidesPages, rankSlug);
  if (!guide) notFound();

  return {
    locale,
    rankSlug,
    guide,
    rankName: tRanks(`rankNames.${rankSlug}`),
    beltColor: getBeltColorHex(rankSlug),
    tRanks,
    tGuides,
  };
}

/**
 * Load DB-backed rank requirements for the "Try the challenge" CTA that
 * appears on the final page of a flat or chapter body. Mukyu is UI-only and
 * has no DB entry, so we return an empty array for it.
 *
 * Only called by the body renderers — the chapter-list layer does NOT need
 * requirements and MUST NOT pay the DB round-trip.
 */
async function loadRequirements(rankSlug: RankSlug): Promise<ChallengeScoreRequirement[]> {
  if (isMukyuSlug(rankSlug)) return [];
  const result = await getValidatedRank(rankSlug);
  if (!result) notFound();
  return result.requirements;
}

// ---------------------------------------------------------------------------
// Paragraph renderer (shared by flat and chapter bodies)
// ---------------------------------------------------------------------------

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
  tGuides: Translator;
  locale: string;
}): ReactNode {
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

// ---------------------------------------------------------------------------
// Layer renderers — each pure with respect to its inputs
// ---------------------------------------------------------------------------

function renderChapterList(ctx: GuideContext, guide: ChapteredGuide): ReactNode {
  const { locale, rankSlug, rankName, beltColor, tGuides } = ctx;

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: tGuides('breadcrumb.guides'), href: '/guides' },
    { label: rankName },
  ];

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

        <GuidePageFooter locale={locale} items={breadcrumbItems} />
      </PagePanel>
    </div>
  );
}

function renderFlatBody(
  ctx: GuideContext,
  guide: FlatGuide,
  props: FlatBodyProps,
  requirements: ChallengeScoreRequirement[]
): ReactNode {
  const { locale, rankSlug, rankName, beltColor, tRanks, tGuides } = ctx;
  const { pageNumber } = props;

  const pages = guide.pages;
  if (pageNumber > pages.length) notFound();

  const currentPage = pages[pageNumber - 1];
  const isLastPage = pageNumber === pages.length;
  const showChallengeCta = isLastPage && !isMukyuSlug(rankSlug);
  const showPagination = pages.length > 1;

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: tGuides('breadcrumb.guides'), href: '/guides' },
    { label: rankName, href: buildGuidePathRelative(rankSlug, { kind: 'root' }) },
    ...(pageNumber > 1
      ? [{ label: tRanks('detail.pageOf', { current: pageNumber, total: pages.length }) }]
      : []),
  ];

  return (
    <div className="space-y-8">
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

        <GuidePageFooter locale={locale} items={breadcrumbItems} />
      </PagePanel>
    </div>
  );
}

function renderChapterBody(
  ctx: GuideContext,
  guide: ChapteredGuide,
  props: ChapterBodyProps,
  _requirements: ChallengeScoreRequirement[]
): ReactNode {
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

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: tGuides('breadcrumb.guides'), href: '/guides' },
    { label: rankName, href: buildGuidePathRelative(rankSlug, { kind: 'root' }) },
    {
      label: chapter.title,
      href: buildGuidePathRelative(rankSlug, { kind: 'chapter-root', chapterSlug }),
    },
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
  ];

  return (
    <div className="space-y-8">
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

        <GuidePageFooter locale={locale} items={breadcrumbItems} />
      </PagePanel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public entry point — dispatches to one of the three pure renderers.
// ---------------------------------------------------------------------------

/**
 * Shared renderer for all `/guides/ranks/[rank]/...` layers.
 *
 * The route layer is responsible for rank-slug validation; this function
 * trusts `props.slug` to be a real `RankSlug`. After resolving the shared
 * context (i18n + guide data), dispatch runs to one of three pure layer
 * renderers:
 *
 *   - `chapter-list` → `renderChapterList` (no DB hit)
 *   - `flat`         → `renderFlatBody` (+ DB requirements for CTA)
 *   - `chapter-body` → `renderChapterBody` (+ DB requirements, reserved)
 *
 * "Unreachable" format mismatches (e.g. a `chapter-list` props object paired
 * with a flat guide) throw a thrown Error rather than silently returning
 * `notFound()`, so that a future routing bug surfaces loudly instead of
 * being masked as a 404.
 */
export async function renderGuideBody(props: GuideBodyProps): Promise<ReactNode> {
  const ctx = await resolveGuideContext(props.locale, props.slug);
  const { guide } = ctx;

  if (props.kind === 'chapter-list') {
    if (guide.format !== 'chaptered') {
      throw new Error(
        `renderGuideBody: 'chapter-list' requires a chaptered guide, got format='${guide.format}' for rank '${ctx.rankSlug}'. ` +
          `The routing layer should only request 'chapter-list' for chaptered ranks.`
      );
    }
    return renderChapterList(ctx, guide);
  }

  if (props.kind === 'flat') {
    if (guide.format !== 'flat') {
      throw new Error(
        `renderGuideBody: 'flat' requires a flat guide, got format='${guide.format}' for rank '${ctx.rankSlug}'. ` +
          `The routing layer should only request 'flat' for flat ranks.`
      );
    }
    const requirements = await loadRequirements(ctx.rankSlug);
    return renderFlatBody(ctx, guide, props, requirements);
  }

  // kind === 'chapter-body'
  if (guide.format !== 'chaptered') {
    throw new Error(
      `renderGuideBody: 'chapter-body' requires a chaptered guide, got format='${guide.format}' for rank '${ctx.rankSlug}'. ` +
        `The routing layer should only request 'chapter-body' for chaptered ranks.`
    );
  }
  const requirements = await loadRequirements(ctx.rankSlug);
  return renderChapterBody(ctx, guide, props, requirements);
}
