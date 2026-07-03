import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';
import { paginateItems } from '@/lib/pagination';
import { createOpeningPostRateLimit, isRateLimited } from '@/lib/security/rate-limit';
import { createClient } from '@/lib/supabase/server';

import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import { SortSelect } from '@/app/[locale]/(public)/topics/_components/SortSelect';
import { TopicListPageLayout } from '@/app/[locale]/(public)/topics/_components/TopicListPageLayout';
import { renderAttachment } from '@/app/[locale]/(public)/topics/_components/render-attachment';
import {
  TOPIC_PAGE_SIZE,
  buildPaginationHref,
  validateSort,
} from '@/app/[locale]/(public)/topics/_lib/pagination';
import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { OpeningBoardWithMoves } from '../_components/OpeningBoardWithMoves';
import { getOpeningDisplayName } from '../_lib/get-opening-display-name';
import { getOpeningBySlug, getOpeningPostsWithReplyMeta } from '../_lib/queries';
import { OpeningPostCard } from './_components';
import { NewOpeningPostForm } from './new/_components';

export const dynamic = 'force-dynamic';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  sort: parseAsString.withDefault('new'),
});

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const opening = await getOpeningBySlug(slug);

  if (!opening) {
    return {};
  }

  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });
  const displayName = getOpeningDisplayName(nameT, slug, opening.name);

  const t = await getTranslations({ locale, namespace: 'metadata.topicsOpeningDetail' });

  const title = t('title', { name: displayName });
  const description = t('description', { name: displayName });

  return {
    ...generateCanonicalMetadata({ locale, path: `topics/openings/${slug}`, title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

async function OpeningDetailContent({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const opening = await getOpeningBySlug(slug);

  if (!opening) {
    notFound();
  }

  const { page, sort } = await searchParamsCache.parse(searchParams);
  const sortBy = validateSort(sort);

  const t = await getTranslations({ locale, namespace: 'topics' });
  const dt = await getTranslations({ locale, namespace: 'topics.openings.detail' });
  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });

  const displayName = getOpeningDisplayName(nameT, slug, opening.name);

  // Fetch parent opening for breadcrumb if this is a child variation
  const parentOpening = opening.parentSlug ? await getOpeningBySlug(opening.parentSlug) : null;
  const parentDisplayName = parentOpening
    ? getOpeningDisplayName(nameT, parentOpening.slug, parentOpening.name)
    : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allPosts = await getOpeningPostsWithReplyMeta(slug, user?.id, sortBy);
  const {
    totalCount,
    totalPages,
    currentPage,
    paginatedItems: posts,
  } = paginateItems(allPosts, TOPIC_PAGE_SIZE, page);

  // Pre-resolve each visible post's attachment slot upstream because
  // OpeningPostCard is a client component and `getAttachmentsForPosts`
  // is server-only. The OpeningPostCard composes this with the
  // optional rating display in its `extraContent` slot.
  const postIds = posts.map((p) => p.id);
  const attachments = postIds.length > 0 ? await getAttachmentsForPosts(postIds) : new Map();
  const tVideo = await getTranslations({ locale, namespace: 'postVideoAttachmentRender' });
  const fallbackVideoTitle = tVideo('fallbackTitle');

  const buildHref = (p: number) =>
    buildPaginationHref(locale, `/topics/openings/${slug}`, p, sortBy);

  const canPost = !!user && !(await isRateLimited(user.id, createOpeningPostRateLimit(slug)));

  const newPostForm = <NewOpeningPostForm locale={locale} slug={slug} />;

  const communitySection = (
    <section className="space-y-4">
      <SectionTitle>{t('communityThoughts')}</SectionTitle>

      {user ? (
        canPost ? (
          totalCount === 0 ? (
            newPostForm
          ) : (
            <JoinConversationToggle count={totalCount} joinLabel={t('joinConversation')}>
              {newPostForm}
            </JoinConversationToggle>
          )
        ) : null
      ) : (
        <JoinConversationToggle count={totalCount} joinLabel={t('joinConversation')}>
          {newPostForm}
        </JoinConversationToggle>
      )}

      {totalCount > 0 && (
        <SortSelect
          basePath={`/topics/openings/${slug}`}
          translationKey="topics.openings.sort"
          currentSort={sortBy}
        />
      )}
    </section>
  );

  return (
    <TopicListPageLayout
      locale={locale}
      pageTitle={dt('pageTitle')}
      sectionTitle={displayName}
      adBottom={
        (IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )
      }
      topicHeader={
        currentPage === 1 ? (
          <OpeningBoardWithMoves fen={opening.fen} pgn={opening.pgn} />
        ) : undefined
      }
      communitySection={communitySection}
      hasPosts={posts.length > 0}
      postCards={posts.map((post) => {
        const att = attachments.get(post.id);
        return (
          <OpeningPostCard
            key={post.id}
            post={post}
            locale={locale}
            slug={slug}
            attachment={att ? renderAttachment(att, fallbackVideoTitle) : undefined}
          />
        );
      })}
      pagination={{ currentPage, totalPages, buildHref }}
      breadcrumbItems={[
        { label: t('title'), href: '/topics' },
        { label: t('openings.title'), href: '/topics/openings' },
        ...(parentOpening && parentDisplayName
          ? [
              {
                label: parentDisplayName,
                href: `/topics/openings/${parentOpening.slug}`,
              },
            ]
          : []),
        { label: displayName },
      ]}
    />
  );
}

/**
 * Mirrors `OpeningDetailContent`'s resolved DOM to minimise CLS when the
 * real content swaps in. Runtime-only values (opening name, post list)
 * render as placeholder bars.
 */
async function OpeningDetailSkeleton() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'topics.openings.detail' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('pageTitle')}</PageTitle>

      <PagePanel>
        <SectionTitle>
          <div className="h-6 w-48 bg-muted rounded animate-pulse inline-block align-middle" />
        </SectionTitle>

        {/* OpeningBoardWithMoves skeleton */}
        <div className="space-y-3">
          <div className="max-w-xs mx-auto aspect-square bg-muted rounded animate-pulse" />

          <div className="flex justify-center gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-10 h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>

          <div className="flex justify-center">
            <div className="h-5 w-32 bg-muted rounded animate-pulse mt-2" />
          </div>

          <div className="flex justify-center mt-2">
            <div className="h-9 w-48 bg-muted rounded-md animate-pulse mt-1" />
          </div>
        </div>

        <div className="flex items-center justify-between mt-8 mb-6">
          <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          <div className="h-9 w-32 bg-muted rounded-md animate-pulse" />
        </div>

        <div className="flex gap-4 border-b border-border mb-6 pb-2">
          <div className="h-6 w-12 bg-muted rounded animate-pulse" />
          <div className="h-6 w-16 bg-muted rounded animate-pulse" />
          <div className="h-6 w-12 bg-muted rounded animate-pulse" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-muted rounded-full" />
                <div className="h-4 bg-muted rounded w-24" />
              </div>
              <div className="h-3 bg-muted rounded w-20 mb-2" />
              <div className="h-4 bg-muted rounded w-full mb-1" />
              <div className="h-4 bg-muted rounded w-4/5" />
            </div>
          ))}
        </div>

        <Divider />

        <div className="h-4 w-64 bg-muted rounded animate-pulse" />
      </PagePanel>
    </div>
  );
}

/**
 * Deliberately NOT a segment-level `loading.tsx` — see the matching comment
 * on `topics/page.tsx` for the full rationale. A file-based `loading.tsx`
 * here would also wrap the deeper `posts/[postId]` detail route, causing a
 * double-skeleton flash when a `TopicPostCard` links straight into a post.
 */
export default function OpeningDetailPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<OpeningDetailSkeleton />}>
      <OpeningDetailContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
