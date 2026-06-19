/**
 * Chunk detail loading skeleton.
 *
 * Mirrors `page.tsx` (the `force-dynamic` chunk detail) — title → description
 * section → representative board → linked positions → author attribution →
 * metadata row → comments. Without it, a hard load of `/chunks/[slug]` would
 * briefly show the chunk *catalog* list skeleton (`../loading.tsx`, filter
 * chips + card feed) and then swap to this detail layout — a mismatched
 * double skeleton. The chunk title is a runtime value, so it renders as a
 * placeholder bar.
 */
import { getTranslations } from 'next-intl/server';

import { BoardSkeleton } from '@/app/_components';

import { TopicCardSkeleton } from '@/app/[locale]/(public)/topics/_components/TopicCardSkeleton';
import { PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';

export default async function ChunkDetailLoading() {
  const t = await getTranslations('topics.chunks');

  return (
    <div className="space-y-8">
      {/* Title (chunk.title is runtime) */}
      <PageTitle>
        <span className="inline-block h-8 w-64 max-w-full animate-pulse rounded bg-muted align-middle" />
      </PageTitle>

      <PagePanel>
        {/* Description */}
        <SectionTitle>{t('detail.descriptionSection')}</SectionTitle>
        <div className="space-y-2" aria-hidden="true">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        </div>

        {/* Representative board (ThemedBoardThumbnail) */}
        <div className="max-w-xs mx-auto">
          <BoardSkeleton />
        </div>

        {/* Linked positions (puzzle / position-memory cards) */}
        <SectionTitle>{t('detail.positionsSection')}</SectionTitle>
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" aria-hidden="true" />
        <TopicCardSkeleton count={2} />

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

        {/* Comments */}
        <TopicCardSkeleton count={3} thumbnail={false} />
      </PagePanel>
    </div>
  );
}
