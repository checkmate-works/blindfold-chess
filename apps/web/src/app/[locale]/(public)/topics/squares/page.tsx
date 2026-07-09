import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';
import { getPaginationParams } from '@/lib/pagination';
import { createClient } from '@/lib/supabase/server';

import { TopicCardSkeleton } from '@/app/[locale]/(public)/topics/_components/TopicCardSkeleton';
import { TopicTabs } from '@/app/[locale]/(public)/topics/_components/TopicTabs';
import { TopicTabsSkeleton } from '@/app/[locale]/(public)/topics/_components/TopicTabsSkeleton';
import { renderAttachment } from '@/app/[locale]/(public)/topics/_components/render-attachment';
import { TOPIC_PAGE_SIZE } from '@/app/[locale]/(public)/topics/_lib/pagination';
import {
  PageLayout,
  PagePanel,
  PageTitle,
  PaginationNav,
  SectionTitle,
} from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

import { PostCard, SquareBoard } from './_components';
import { getPostCountAcrossSquares, getPostsAcrossSquaresPaginated } from './_lib/queries';

export const dynamic = 'force-dynamic';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({
    params,
    namespace: 'metadata.topicsSquares',
    path: 'topics/squares',
  });
}

async function SquaresContent({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page } = await searchParamsCache.parse(searchParams);
  const t = await getTranslations({ locale, namespace: 'topics' });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const totalCount = await getPostCountAcrossSquares();
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    TOPIC_PAGE_SIZE
  );

  const recentPosts = await getPostsAcrossSquaresPaginated(limit, offset, user?.id);

  // Pre-resolve each visible post's attachment slot upstream because
  // PostCard is a client component and `getAttachmentsForPosts` is
  // server-only.
  const postIds = recentPosts.map((p) => p.id);
  const attachments = postIds.length > 0 ? await getAttachmentsForPosts(postIds) : new Map();
  const tVideo = await getTranslations({ locale, namespace: 'postVideoAttachmentRender' });
  const fallbackVideoTitle = tVideo('fallbackTitle');

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/${locale}/topics/squares${qs ? `?${qs}` : ''}`;
  };

  return (
    <PageLayout
      title={t('squares.title')}
      locale={locale}
      breadcrumb={[{ label: t('title'), href: '/topics' }, { label: t('squares.title') }]}
    >
      <SectionTitle>{t('squares.subtitle')}</SectionTitle>

      <div className="mb-6">
        <TopicTabs active="squares" locale={locale} />
      </div>

      <SectionTitle>{t('squares.recentPosts')}</SectionTitle>

      {recentPosts.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">{t('squares.noRecentPosts')}</p>
      ) : (
        <div className="space-y-3">
          {recentPosts.map((post) => {
            const att = attachments.get(post.id);
            return (
              <PostCard
                key={post.id}
                post={post}
                locale={locale}
                square={post.topicKey}
                showSquareBadge
                attachment={att ? renderAttachment(att, fallbackVideoTitle) : undefined}
              />
            );
          })}
        </div>
      )}

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />

      <AdSlot slot="content-middle" />

      {currentPage === 1 && (
        <>
          <SectionTitle>{t('squares.sectionTitle')}</SectionTitle>
          <SquareBoard locale={locale} />
        </>
      )}

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}

/**
 * Mirrors `SquaresContent`'s resolved DOM (PageTitle → squares.subtitle
 * SectionTitle → TopicTabs → recent-posts list) to minimise CLS. The board
 * section sits below the fold, so the skeleton focuses on the lead
 * recent-posts feed.
 */
async function SquaresSkeleton() {
  const locale = await getLocaleFromPathnameHeader();
  const t = await getTranslations({ locale, namespace: 'topics' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('squares.title')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('squares.subtitle')}</SectionTitle>

        <div className="mb-6">
          <TopicTabsSkeleton />
        </div>

        <SectionTitle>{t('squares.recentPosts')}</SectionTitle>
        <TopicCardSkeleton thumbnail={false} />
      </PagePanel>
    </div>
  );
}

/**
 * Deliberately NOT a segment-level `loading.tsx` — see the matching comment
 * on `topics/page.tsx` for the full rationale. A file-based `loading.tsx`
 * here would also wrap the deeper `[square]` and `[square]/posts/[postId]`
 * detail routes, causing a double-skeleton flash on direct navigation.
 */
export default function SquaresPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<SquaresSkeleton />}>
      <SquaresContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
