import React from 'react';
import type { ReactNode } from 'react';

import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { SITE_URL } from '@/config';

import { ALL_RANK_SLUGS, isMukyuSlug } from '@/lib/db/data/ranks';
import type { ChallengeScoreRequirement, RankSlug } from '@/lib/db/data/ranks';
import {
  buildChapterHref,
  buildFlatHref,
  buildGuidePath,
  buildGuidePathRelative,
  findChapter,
  getRankGuide,
} from '@/lib/guides';
import type { ChapteredGuide, FlatGuide, GuidePage, RankGuide } from '@/lib/guides';
import { JsonLd, generateItemListSchema, generateLearningResourceSchema } from '@/lib/seo/jsonld';

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

type RankNavigationNeighbour = {
  slug: RankSlug;
  rankName: string;
};

type GuideContext = {
  locale: Locale;
  rankSlug: RankSlug;
  guide: RankGuide;
  rankName: string;
  beltColor: string;
  tRanks: Translator;
  tGuides: Translator;
  /**
   * Adjacent ranks that have published guide content. Either side is `null`
   * at the extremes of `ALL_RANK_SLUGS` or when the adjacent rank has no
   * guide entry in `guides.pages`.
   */
  prevRank: RankNavigationNeighbour | null;
  nextRank: RankNavigationNeighbour | null;
};

/**
 * Find the nearest sibling rank in `ALL_RANK_SLUGS` that has guide content,
 * walking in `step === -1` (previous) or `step === +1` (next) direction.
 * Returns `null` when no reachable sibling with a published guide exists.
 */
function findAdjacentGuidedRank(
  currentSlug: RankSlug,
  step: -1 | 1,
  guidesPages: Record<string, unknown>,
  tRanks: Translator
): RankNavigationNeighbour | null {
  const index = (ALL_RANK_SLUGS as readonly string[]).indexOf(currentSlug);
  if (index === -1) return null;
  for (let i = index + step; i >= 0 && i < ALL_RANK_SLUGS.length; i += step) {
    const slug = ALL_RANK_SLUGS[i];
    if (getRankGuide(guidesPages, slug) !== null) {
      return { slug, rankName: tRanks(`rankNames.${slug}`) };
    }
  }
  return null;
}

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
    prevRank: findAdjacentGuidedRank(rankSlug, -1, guidesPages, tRanks),
    nextRank: findAdjacentGuidedRank(rankSlug, +1, guidesPages, tRanks),
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
// Rank navigation (prev / next guide) — shared between flat + chapter bodies
// ---------------------------------------------------------------------------

/**
 * Prev / next rank guide links, rendered on the last page of a flat guide
 * and on every chapter body page. Either side collapses silently when there
 * is no adjacent guided rank — e.g. mukyu has no previous, 3kyu currently
 * has no next because 2kyu has no guide content yet.
 */
function RankNavigation({ ctx }: { ctx: GuideContext }): ReactNode {
  const { locale, tGuides, prevRank, nextRank } = ctx;
  if (!prevRank && !nextRank) return null;

  return (
    <nav
      aria-label="Rank guide navigation"
      className="mt-6 flex items-center justify-between gap-4"
    >
      {prevRank ? (
        <a
          href={buildGuidePath(locale, prevRank.slug, { kind: 'root' })}
          className="text-sm text-link-primary hover:underline"
        >
          ← {tGuides('navigation.prevRank', { rankName: prevRank.rankName })}
        </a>
      ) : (
        <span />
      )}
      {nextRank ? (
        <a
          href={buildGuidePath(locale, nextRank.slug, { kind: 'root' })}
          className="text-sm text-link-primary hover:underline"
        >
          {tGuides('navigation.nextRank', { rankName: nextRank.rankName })} →
        </a>
      ) : (
        <span />
      )}
    </nav>
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

  // Chapter list = an ordered index of the child chapter pages. An ItemList
  // gives search engines a crawlable hint about the section hierarchy.
  const itemListItems = guide.chapters.map((chapter) => ({
    name: chapter.title,
    url: `${SITE_URL}${buildGuidePath(locale, rankSlug, {
      kind: 'chapter-root',
      chapterSlug: chapter.slug,
    })}`,
  }));

  return (
    <div className="space-y-8">
      <JsonLd data={generateItemListSchema(itemListItems)} />

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

async function renderFlatBody(
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

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: tGuides('breadcrumb.guides'), href: '/guides' },
    { label: rankName, href: buildGuidePathRelative(rankSlug, { kind: 'root' }) },
    ...(pageNumber > 1
      ? [{ label: tRanks('detail.pageOf', { current: pageNumber, total: pages.length }) }]
      : []),
  ];

  // LearningResource JSON-LD keeps SERP metadata and structured data in sync
  // by pulling from the same `metadata.guides.rank` translation keys used by
  // `generateMetadata` in the route file.
  const tMetaRank = await getTranslations({ locale, namespace: 'metadata.guides.rank' });
  const lrName =
    pageNumber === 1
      ? tMetaRank('title', { rankName })
      : tMetaRank('pageTitle', { rankName, page: pageNumber });
  const lrDescription =
    pageNumber === 1
      ? tMetaRank('description', { rankName })
      : tMetaRank('descriptionWithPage', { rankName, page: pageNumber, total: pages.length });
  const lrPath =
    pageNumber === 1
      ? buildGuidePath(locale, rankSlug, { kind: 'root' })
      : buildGuidePath(locale, rankSlug, { kind: 'flat-page', page: pageNumber });
  const lrUrl = `${SITE_URL}${lrPath}`;

  return (
    <div className="space-y-8">
      <JsonLd
        data={generateLearningResourceSchema({
          name: lrName,
          description: lrDescription,
          url: lrUrl,
          inLanguage: locale,
          educationalLevel: rankName,
          learningResourceType: 'Guide',
        })}
      />

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

async function renderChapterBody(
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

  // LearningResource JSON-LD for chapter pages — mirrors `metadata.guides.chapter`.
  const tMetaChapter = await getTranslations({ locale, namespace: 'metadata.guides.chapter' });
  const lrName =
    pageNumber === 1
      ? tMetaChapter('title', { rankName, chapterName: chapter.title })
      : tMetaChapter('pageTitle', { rankName, chapterName: chapter.title, page: pageNumber });
  const lrDescription =
    pageNumber === 1
      ? tMetaChapter('description', { rankName, chapterName: chapter.title })
      : tMetaChapter('descriptionWithPage', {
          rankName,
          chapterName: chapter.title,
          page: pageNumber,
          total: chapter.pages.length,
        });
  const lrPath =
    pageNumber === 1
      ? buildGuidePath(locale, rankSlug, { kind: 'chapter-root', chapterSlug })
      : buildGuidePath(locale, rankSlug, {
          kind: 'chapter-page',
          chapterSlug,
          page: pageNumber,
        });
  const lrUrl = `${SITE_URL}${lrPath}`;

  return (
    <div className="space-y-8">
      <JsonLd
        data={generateLearningResourceSchema({
          name: lrName,
          description: lrDescription,
          url: lrUrl,
          inLanguage: locale,
          educationalLevel: rankName,
          learningResourceType: 'Guide',
          teaches: chapter.title,
        })}
      />

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
