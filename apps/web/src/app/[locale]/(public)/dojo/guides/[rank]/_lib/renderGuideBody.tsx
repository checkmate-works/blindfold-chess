import type { ReactNode } from 'react';

import type { RankSlug } from '@/lib/db/data/ranks';

import type { Locale } from '@/app/[locale]/_lib/types';

import { loadRequirements, resolveGuideContext } from './render-guide-body/context';
import { renderChapterBody } from './render-guide-body/renderChapterBody';
import { renderChapterList } from './render-guide-body/renderChapterList';
import { renderFlatBody } from './render-guide-body/renderFlatBody';

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

/**
 * Shared renderer for all `/dojo/guides/[rank]/...` layers.
 *
 * The route layer is responsible for rank-slug validation; this function
 * trusts `props.slug` to be a real `RankSlug`. After resolving the shared
 * context (i18n + guide data), dispatch runs to one of three pure layer
 * renderers split into `render-guide-body/`:
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
