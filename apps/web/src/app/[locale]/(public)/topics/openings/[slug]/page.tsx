import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { BoardFrame } from '@/app/_components';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';
import { paginateItems } from '@/lib/pagination';
import type { RepertoireSort } from '@/lib/repertoires/queries';
import { countPublicRepertoiresForOpening } from '@/lib/repertoires/queries';
import { createOpeningPostRateLimit, isRateLimited } from '@/lib/security/rate-limit';
import { createClient } from '@/lib/supabase/server';

import { MOVE_NAV_ROW_CLASS } from '@/app/[locale]/(public)/games/play/_lib/skeleton-layout-classes';
import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import { SortSelect } from '@/app/[locale]/(public)/topics/_components/SortSelect';
import { TopicListPageLayout } from '@/app/[locale]/(public)/topics/_components/TopicListPageLayout';
import { renderAttachment } from '@/app/[locale]/(public)/topics/_components/render-attachment';
import {
  TOPIC_PAGE_SIZE,
  buildPaginationHref,
  validateSort,
} from '@/app/[locale]/(public)/topics/_lib/pagination';
import { Divider, LinkTabs, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Skeleton } from '@/app/[locale]/_components/Skeleton';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { OpeningBoardWithMoves } from '../_components/OpeningBoardWithMoves';
import { getOpeningDisplayName } from '../_lib/get-opening-display-name';
import { getOpeningBySlug, getOpeningPostsWithReplyMeta } from '../_lib/queries';
import { OpeningPostCard } from './_components';
import { OpeningRepertoiresSection } from './_components/OpeningRepertoiresSection';
import { NewOpeningPostForm } from './new/_components';

export const dynamic = 'force-dynamic';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  sort: parseAsString.withDefault('new'),
  tab: parseAsString.withDefault('comments'),
});

const TAB_VALUES = ['comments', 'repertoires'] as const;
type OpeningTab = (typeof TAB_VALUES)[number];

/**
 * Community thoughts stays the default panel — the discussion is what an opening
 * page has always been. Repertoires is the opt-in second panel, so an unknown
 * `?tab=` falls back to the comments rather than 404ing.
 */
function parseTab(tab: string): OpeningTab {
  return TAB_VALUES.find((value) => value === tab) ?? 'comments';
}

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
  const [opening, { page, sort, tab }, t, dt, nameT, tRepertoires, supabase, repertoireCount] =
    await Promise.all([
      getOpeningBySlug(slug),
      searchParamsCache.parse(searchParams),
      getTranslations({ locale, namespace: 'topics' }),
      getTranslations({ locale, namespace: 'topics.openings.detail' }),
      getTranslations({ locale, namespace: 'topics.openings.names' }),
      getTranslations({ locale, namespace: 'Repertoires' }),
      createClient(),
      countPublicRepertoiresForOpening(slug),
    ]);

  if (!opening) {
    notFound();
  }

  const sortBy = validateSort(sort);
  const activeTab = parseTab(tab);
  const isRepertoiresTab = activeTab === 'repertoires';

  const displayName = getOpeningDisplayName(nameT, slug, opening.name);

  // The parent opening (breadcrumb, child variations only) is keyed on the
  // opening row; the viewer lookup is keyed on the session — independent.
  const [
    {
      data: { user },
    },
    parentOpening,
  ] = await Promise.all([
    supabase.auth.getUser(),
    opening.parentSlug ? getOpeningBySlug(opening.parentSlug) : null,
  ]);
  const parentDisplayName = parentOpening
    ? getOpeningDisplayName(nameT, parentOpening.slug, parentOpening.name)
    : null;

  const [allPosts, rateLimited] = await Promise.all([
    getOpeningPostsWithReplyMeta(slug, user?.id, sortBy),
    user ? isRateLimited(user.id, createOpeningPostRateLimit(slug)) : false,
  ]);
  const { totalCount, totalPages, currentPage, paginatedItems } = paginateItems(
    allPosts,
    TOPIC_PAGE_SIZE,
    page
  );

  // The comment list belongs to the comments tab; the other tab renders none of
  // it (though its count still labels the tab). Emptying the list here is what
  // switches off the post cards, their attachment lookups, and the pager below.
  const posts = isRepertoiresTab ? [] : paginatedItems;

  // Pre-resolve each visible post's attachment slot upstream because
  // OpeningPostCard is a client component and `getAttachmentsForPosts`
  // is server-only. The OpeningPostCard composes this with the
  // optional rating display in its `extraContent` slot.
  const postIds = posts.map((p) => p.id);
  const [attachments, tVideo] = await Promise.all([
    postIds.length > 0 ? getAttachmentsForPosts(postIds) : new Map(),
    getTranslations({ locale, namespace: 'postVideoAttachmentRender' }),
  ]);
  const fallbackVideoTitle = tVideo('fallbackTitle');

  const buildHref = (p: number) =>
    buildPaginationHref(locale, `/topics/openings/${slug}`, p, sortBy);

  const canPost = !!user && !rateLimited;

  const newPostForm = <NewOpeningPostForm locale={locale} slug={slug} />;

  /*
   * Community thoughts and the repertoires covering this opening are two
   * separate bodies of content about the same opening, so they tab rather than
   * stack (the chunk detail page's pattern, same `LinkTabs` + `?tab=` query
   * param — each panel is server-rendered on demand and a shared link reopens
   * on the right tab). Both tabs always render so the tab set is stable and the
   * count says what's inside; the Repertoires tab is simply empty when nobody
   * has prepared this opening yet.
   */
  const tabs = (
    <LinkTabs
      variant="underline"
      locale={locale}
      activeValue={activeTab}
      scroll={false}
      aria-label={displayName}
      items={[
        {
          value: 'comments',
          label: `${t('communityThoughts')} (${totalCount})`,
          href: `/topics/openings/${slug}?tab=comments`,
        },
        {
          value: 'repertoires',
          label: `${tRepertoires('detail.forThisOpening')} (${repertoireCount})`,
          href: `/topics/openings/${slug}?tab=repertoires`,
        },
      ]}
    />
  );

  // The repertoires panel has no reply activity, so it offers `new` / `popular`
  // only — the same `?sort=` param, narrowed.
  const repertoireSort: RepertoireSort = sortBy === 'popular' ? 'popular' : 'new';

  const repertoiresSection = (
    <section className="space-y-4">
      {tabs}
      <OpeningRepertoiresSection
        locale={locale}
        slug={slug}
        sort={repertoireSort}
        count={repertoireCount}
        currentUserId={user?.id}
      />
    </section>
  );

  const communitySection = (
    <section className="space-y-4">
      {tabs}

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
      topicHeader={
        currentPage === 1 ? (
          <OpeningBoardWithMoves fen={opening.fen} pgn={opening.pgn} />
        ) : undefined
      }
      communitySection={isRepertoiresTab ? repertoiresSection : communitySection}
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
      pagination={
        // The repertoires panel shows a single strip, so there is nothing to
        // page through — one page hides the pager.
        isRepertoiresTab
          ? { currentPage: 1, totalPages: 1, buildHref }
          : { currentPage, totalPages, buildHref }
      }
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
async function OpeningDetailSkeleton({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'topics.openings.detail' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('pageTitle')}</PageTitle>

      <PagePanel>
        <SectionTitle>
          <Skeleton className="h-6 w-48 rounded inline-block align-middle" />
        </SectionTitle>

        {/* OpeningBoardWithMoves skeleton: move list + board + nav row + CTA */}
        <div className="space-y-3">
          <BoardFrame expandOnMobile>
            <div className="flex items-center gap-1 px-2 py-1.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-16 rounded" />
              ))}
            </div>

            <Skeleton className="aspect-square rounded" />

            {/* Same reserved height as the real strip, which is touch-sized
                below `sm` — a fixed 40px row would shift the page on hydrate. */}
            <div className={`flex items-center justify-center ${MOVE_NAV_ROW_CLASS}`}>
              <Skeleton className="h-12 w-52 rounded" />
            </div>
          </BoardFrame>

          <div className="flex justify-center">
            <Skeleton className="h-9 w-48 rounded-md" />
          </div>
        </div>

        {/* Tab row (Community thoughts / Repertoires) — underline variant, so a
            border under the row and two left-aligned labels. */}
        <div className="mt-8 mb-4 flex gap-6 border-b border-border pb-2">
          <Skeleton className="h-6 w-44 rounded" />
          <Skeleton className="h-6 w-40 rounded" />
        </div>

        {/* JoinConversationToggle, then the sort control (label + select). */}
        <Skeleton className="mb-4 h-9 w-48 rounded-md" />

        <div className="mb-6 flex items-center gap-2">
          <Skeleton className="h-5 w-14 rounded" />
          <Skeleton className="h-9 w-28 rounded-md" />
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

        <Skeleton className="h-4 w-64 rounded" />
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
export default async function OpeningDetailPage({ params, searchParams }: Props) {
  const { locale } = await params;
  return (
    <Suspense fallback={<OpeningDetailSkeleton locale={locale} />}>
      <OpeningDetailContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
