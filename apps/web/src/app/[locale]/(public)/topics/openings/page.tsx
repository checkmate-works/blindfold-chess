import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import { ADSENSE_SLOT_CONTENT_BOTTOM, ADSENSE_SLOT_CONTENT_MIDDLE, IS_LOCAL_DEV } from '@/config';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';
import { getPaginationParams } from '@/lib/pagination';
import { createClient } from '@/lib/supabase/server';

import { TopicPostCard } from '@/app/[locale]/(public)/(home)/_components/TopicPostCard';
import { TopicCardSkeleton } from '@/app/[locale]/(public)/topics/_components/TopicCardSkeleton';
import { TopicTabs } from '@/app/[locale]/(public)/topics/_components/TopicTabs';
import { TopicTabsSkeleton } from '@/app/[locale]/(public)/topics/_components/TopicTabsSkeleton';
import { renderAttachment } from '@/app/[locale]/(public)/topics/_components/render-attachment';
import { TOPIC_PAGE_SIZE } from '@/app/[locale]/(public)/topics/_lib/pagination';
import { isValidSquare } from '@/app/[locale]/(public)/topics/squares/_lib/squares';
import {
  PageLayout,
  PagePanel,
  PageTitle,
  PaginationNav,
  SectionTitle,
} from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

import {
  OpeningCard,
  OpeningCategoryFilter,
  OpeningCategorySectionTitle,
  OpeningsListByCategory,
} from './_components';
import { getOpeningDisplayName } from './_lib/get-opening-display-name';
import {
  getOpeningsAsTree,
  getOpeningsAsTreeByFirstMoveSquare,
  getPostCountAcrossOpenings,
  getPostCountByFirstMoveSquare,
  getPostsAcrossOpeningsPaginated,
  getPostsByFirstMoveSquarePaginated,
} from './_lib/queries';

export const dynamic = 'force-dynamic';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  first_move: parseAsString,
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'metadata.topicsOpenings',
    path: 'topics/openings',
  });
}

async function OpeningsContent({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page, first_move } = await searchParamsCache.parse(searchParams);
  const t = await getTranslations({ locale, namespace: 'topics' });
  const tSquares = await getTranslations({ locale, namespace: 'topics.squares' });
  const tOpenings = await getTranslations({ locale, namespace: 'topics.openings' });
  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstMoveSquare = first_move && isValidSquare(first_move) ? first_move : null;

  const totalCount = firstMoveSquare
    ? await getPostCountByFirstMoveSquare(firstMoveSquare)
    : await getPostCountAcrossOpenings();
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    TOPIC_PAGE_SIZE
  );

  const recentPosts = firstMoveSquare
    ? await getPostsByFirstMoveSquarePaginated(firstMoveSquare, limit, offset, user?.id)
    : await getPostsAcrossOpeningsPaginated(limit, offset, user?.id);

  // Pre-resolve each visible post's attachment slot upstream because
  // TopicPostCard is a client component and `getAttachmentsForPosts`
  // is server-only. Posts with no attachment row drop out of the map.
  const postIds = recentPosts.map((p) => p.id);
  const attachments = postIds.length > 0 ? await getAttachmentsForPosts(postIds) : new Map();
  const tVideo = await getTranslations({ locale, namespace: 'postVideoAttachmentRender' });
  const fallbackVideoTitle = tVideo('fallbackTitle');

  const openings = firstMoveSquare
    ? await getOpeningsAsTreeByFirstMoveSquare(firstMoveSquare)
    : await getOpeningsAsTree();

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (firstMoveSquare) params.set('first_move', firstMoveSquare);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/${locale}/topics/openings${qs ? `?${qs}` : ''}`;
  };

  return (
    <PageLayout
      title={t('openings.title')}
      locale={locale}
      breadcrumb={[{ label: t('title'), href: '/topics' }, { label: t('openings.title') }]}
    >
      <SectionTitle>{t('openings.subtitle')}</SectionTitle>

      <div className="mb-6">
        <TopicTabs active="openings" locale={locale} />
      </div>

      {recentPosts.length > 0 && (
        <>
          <SectionTitle>{t('openings.recentPosts')}</SectionTitle>
          <div className="space-y-3">
            {recentPosts.map((post) => {
              const tTopic = post.topicType === 'opening' ? tOpenings : tSquares;
              const att = attachments.get(post.id);
              return (
                <TopicPostCard
                  key={post.id}
                  post={post}
                  locale={locale}
                  showMoreLabel={t('showMore')}
                  justNowLabel={tTopic('justNow')}
                  variant="card"
                  attachment={att ? renderAttachment(att, fallbackVideoTitle) : undefined}
                />
              );
            })}
          </div>
          <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
        </>
      )}

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_MIDDLE) && (
        <AdSenseGuard slot="content-middle" slotId={ADSENSE_SLOT_CONTENT_MIDDLE ?? ''} />
      )}

      {firstMoveSquare
        ? currentPage === 1 && (
            <>
              <SectionTitle>
                {t('openings.firstMoveFilter.title', { square: firstMoveSquare })}
              </SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {openings.map((opening) => (
                  <div key={opening.id}>
                    <OpeningCard
                      opening={opening}
                      displayName={getOpeningDisplayName(nameT, opening.slug, opening.name)}
                      locale={locale}
                    />
                    {opening.children.length > 0 && (
                      <div className="border-l-2 border-border ml-4 pl-2 mt-1 space-y-1">
                        {opening.children.map((child) => (
                          <OpeningCard
                            key={child.id}
                            opening={child}
                            displayName={getOpeningDisplayName(nameT, child.slug, child.name)}
                            locale={locale}
                            compact
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )
        : currentPage === 1 && (
            <Suspense>
              <OpeningCategorySectionTitle />
              <OpeningCategoryFilter />
              <OpeningsListByCategory openings={openings} locale={locale} />
            </Suspense>
          )}

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}
    </PageLayout>
  );
}

/**
 * Mirrors `OpeningsContent`'s resolved DOM to minimise CLS when the real
 * content swaps in.
 */
async function OpeningsSkeleton() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'topics' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('openings.title')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('openings.subtitle')}</SectionTitle>

        <div className="mb-6">
          <TopicTabsSkeleton />
        </div>

        <SectionTitle>{t('openings.recentPosts')}</SectionTitle>
        <TopicCardSkeleton count={3} />

        <div className="mt-8 mb-6">
          <SectionTitle>
            <div className="h-6 w-32 bg-muted rounded animate-pulse inline-block align-middle" />
          </SectionTitle>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-5 w-16 bg-muted rounded animate-pulse" />
          <div className="h-9 w-40 bg-muted rounded-md animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-3 p-3 rounded-lg border border-border bg-card animate-pulse"
            >
              <div className="w-[96px] h-[96px] bg-muted rounded-sm shrink-0" />
              <div className="flex flex-col justify-center min-w-0 flex-1">
                <div className="h-3 bg-muted rounded w-12 mb-2" />
                <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                <div className="h-3 bg-muted rounded w-full mt-2" />
              </div>
            </div>
          ))}
        </div>
      </PagePanel>
    </div>
  );
}

/**
 * Deliberately NOT a segment-level `loading.tsx` — see the matching comment
 * on `topics/page.tsx` for the full rationale. A file-based `loading.tsx`
 * here would also wrap the deeper `[slug]` and `[slug]/posts/[postId]`
 * detail routes, causing a double-skeleton flash on direct navigation.
 */
export default function OpeningsPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<OpeningsSkeleton />}>
      <OpeningsContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
