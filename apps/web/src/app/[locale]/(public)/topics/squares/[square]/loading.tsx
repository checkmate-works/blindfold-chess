/**
 * Square detail loading skeleton.
 *
 * Mirrors `page.tsx` (the `force-dynamic` square detail) — PageTitle →
 * square SectionTitle → SquareHighlightBoard → linked-openings grid →
 * community thoughts → posts feed. Without it, a hard load of
 * `/topics/squares/[square]` would briefly show the squares *index* list
 * skeleton (`../loading.tsx`, a recent-posts feed) and then swap to this
 * detail layout — the same mismatched double-skeleton the openings detail
 * already avoids via its own `loading.tsx`. The square name and the
 * openings-link heading are runtime values, so they render as placeholder
 * bars.
 */
import { getTranslations } from 'next-intl/server';

import { BoardSkeleton } from '@/app/_components';

import { PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';

import { TopicCardSkeleton } from '../../_components/TopicCardSkeleton';

export default async function SquareDetailLoading() {
  const t = await getTranslations('topics');

  return (
    <div className="space-y-8">
      <PageTitle>{t('squares.pageTitle')}</PageTitle>

      <PagePanel>
        {/* Square name */}
        <SectionTitle>
          <div className="inline-block h-6 w-16 animate-pulse rounded bg-muted align-middle" />
        </SectionTitle>

        {/* SquareHighlightBoard (renders BoardSkeleton until preferences load) */}
        <div className="max-w-xs mx-auto">
          <BoardSkeleton />
        </div>

        {/* Openings whose first move lands on this square (up to 3 cards) */}
        <div className="space-y-3">
          <SectionTitle>
            <div className="inline-block h-5 w-40 animate-pulse rounded bg-muted align-middle" />
          </SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg border border-border bg-card" />
            ))}
          </div>
        </div>

        {/* Community thoughts */}
        <section className="mt-8 space-y-4">
          <SectionTitle>{t('communityThoughts')}</SectionTitle>
          <div className="h-10 w-full animate-pulse rounded-md bg-muted" aria-hidden="true" />
        </section>

        {/* Posts (BaseTopicPostCard — no thumbnail) */}
        <div className="mt-6">
          <TopicCardSkeleton thumbnail={false} />
        </div>
      </PagePanel>
    </div>
  );
}
