import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { BoardFrame } from '@/app/_components';
import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';
import { paginateItems } from '@/lib/pagination';
import type { RepertoireSort } from '@/lib/repertoires/queries';
import { countPublicRepertoiresForOpening } from '@/lib/repertoires/queries';
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
import { Divider, LinkTabs, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
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
  const opening = await getOpeningBySlug(slug);

  if (!opening) {
    notFound();
  }

  const { page, sort, tab } = await searchParamsCache.parse(searchParams);
  const sortBy = validateSort(sort);
  const activeTab = parseTab(tab);
  const isRepertoiresTab = activeTab === 'repertoires';

  const t = await getTranslations({ locale, namespace: 'topics' });
  const dt = await getTranslations({ locale, namespace: 'topics.openings.detail' });
  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });
  const tRepertoires = await getTranslations({ locale, namespace: 'Repertoires' });

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
  const attachments = postIds.length > 0 ? await getAttachmentsForPosts(postIds) : new Map();
  const tVideo = await getTranslations({ locale, namespace: 'postVideoAttachmentRender' });
  const fallbackVideoTitle = tVideo('fallbackTitle');

  const buildHref = (p: number) =>
    buildPaginationHref(locale, `/topics/openings/${slug}`, p, sortBy);

  const canPost = !!user && !(await isRateLimited(user.id, createOpeningPostRateLimit(slug)));

  const repertoireCount = await countPublicRepertoiresForOpening(slug);

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
async function OpeningDetailSkeleton() {
  const locale = await getLocaleFromPathnameHeader();
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
          <BoardFrame expandOnMobile>
            <div className="aspect-square bg-muted rounded animate-pulse" />
          </BoardFrame>

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

        {/* Tab row (Community thoughts / Repertoires) — underline variant, so a
            border under the row and two left-aligned labels. */}
        <div className="mt-8 mb-4 flex gap-6 border-b border-border pb-2">
          <div className="h-6 w-44 bg-muted rounded animate-pulse" />
          <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        </div>

        {/* JoinConversationToggle, then the sort control (label + select). */}
        <div className="mb-4 h-9 w-48 bg-muted rounded-md animate-pulse" />

        <div className="mb-6 flex items-center gap-2">
          <div className="h-5 w-14 bg-muted rounded animate-pulse" />
          <div className="h-9 w-28 bg-muted rounded-md animate-pulse" />
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
