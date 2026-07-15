/**
 * Chunk detail loading skeleton.
 *
 * Mirrors `page.tsx` (the `force-dynamic` chunk detail): title → description
 * section → representative board → author attribution → metadata row → the
 * Positions / Related games / Comments tab row → the default (Positions) tab
 * content. Without it, a hard load of `/chunks/[slug]` would briefly show the
 * chunk *catalog* list skeleton (`../loading.tsx`, filter chips + card feed)
 * and then swap to this detail layout — a mismatched double skeleton. The
 * chunk title is a runtime value, so it renders as a placeholder bar.
 *
 * The section title lives in the `chunks` namespace (`chunks.detail.*`), not
 * `topics.chunks` — the page reads it via its `tChunks` translator. The tab
 * labels come from `topics.chunks` (comments / related games) and `chunks`
 * (positions), matching the page exactly so they don't shift when the real
 * tabs (with counts) mount.
 */
import { getTranslations } from 'next-intl/server';

import { BoardFrame, BoardSkeleton } from '@/app/_components';
import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import { TopicCardSkeleton } from '@/app/[locale]/(public)/topics/_components/TopicCardSkeleton';
import { PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { tabItemClass, tabsRowClass } from '@/app/[locale]/_components/tab-styles';

export default async function ChunkDetailLoading() {
  const locale = await getLocaleFromPathnameHeader();
  const [t, tChunks] = await Promise.all([
    getTranslations({ locale, namespace: 'topics.chunks' }),
    getTranslations({ locale, namespace: 'chunks' }),
  ]);

  return (
    <div className="space-y-8">
      {/* Title (chunk.title is runtime) */}
      <PageTitle>
        <span className="inline-block h-8 w-64 max-w-full animate-pulse rounded bg-muted align-middle" />
      </PageTitle>

      <PagePanel>
        {/* Description */}
        <SectionTitle>{tChunks('detail.descriptionSection')}</SectionTitle>
        <div className="space-y-2" aria-hidden="true">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        </div>

        {/* Representative board (ThemedBoardThumbnail) */}
        <BoardFrame>
          <BoardSkeleton />
        </BoardFrame>

        {/* Author attribution */}
        <div className="flex items-center gap-2" aria-hidden="true">
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>

        {/* Metadata row (like affordance + timestamp) */}
        <div className="flex flex-wrap items-center justify-between gap-4" aria-hidden="true">
          <div className="h-6 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        </div>

        {/* Tab row — Positions is the default tab. Static labels (no counts yet)
            using the same underline classes as the real LinkTabs. */}
        <div className={tabsRowClass.underline} role="tablist" aria-hidden="true">
          <span className={tabItemClass('underline', true)}>
            {tChunks('detail.positionsSection')}
          </span>
          <span className={tabItemClass('underline', false)}>{t('relatedGames.tab')}</span>
          <span className={tabItemClass('underline', false)}>{t('commentsTitle')}</span>
        </div>

        {/* Default tab content: linked positions (description line + cards) */}
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" aria-hidden="true" />
        <TopicCardSkeleton count={2} />
      </PagePanel>
    </div>
  );
}
