import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { BoardSkeleton } from '@/app/_components';
import { ADSENSE_SLOT_CONTENT_BOTTOM, ADSENSE_SLOT_CONTENT_MIDDLE, IS_LOCAL_DEV } from '@/config';
import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';
import { Link } from '@/i18n/routing';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';
import { getPaginationParams } from '@/lib/pagination';
import { createClient } from '@/lib/supabase/server';

import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import { SortSelect } from '@/app/[locale]/(public)/topics/_components/SortSelect';
import { TopicCardSkeleton } from '@/app/[locale]/(public)/topics/_components/TopicCardSkeleton';
import { TopicListPageLayout } from '@/app/[locale]/(public)/topics/_components/TopicListPageLayout';
import { renderAttachment } from '@/app/[locale]/(public)/topics/_components/render-attachment';
import {
  TOPIC_PAGE_SIZE,
  buildPaginationHref,
  validateSort,
} from '@/app/[locale]/(public)/topics/_lib/pagination';
import { OpeningCard } from '@/app/[locale]/(public)/topics/openings/_components';
import { getOpeningDisplayName } from '@/app/[locale]/(public)/topics/openings/_lib/get-opening-display-name';
import { getOpeningsByFirstMoveSquare } from '@/app/[locale]/(public)/topics/openings/_lib/queries';
import { PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getPostCountForSquare, getPostsWithReplyMetaPaginated } from '../_lib/queries';
import { isValidSquare } from '../_lib/squares';
import { PostCard, SquareHighlightBoard } from './_components';
import { NewPostForm } from './new/_components';

export const dynamic = 'force-dynamic';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  sort: parseAsString.withDefault('new'),
});

type Props = {
  params: Promise<{ locale: Locale; square: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, square } = await params;

  if (!isValidSquare(square)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'metadata.topicsSquare' });

  const title = t('title', { square });
  const description = t('description', { square });

  return {
    ...generateCanonicalMetadata({ locale, path: `topics/squares/${square}`, title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

async function SquarePostsContent({ params, searchParams }: Props) {
  const { locale, square } = await params;

  if (!isValidSquare(square)) {
    notFound();
  }

  const { page, sort } = await searchParamsCache.parse(searchParams);
  const sortBy = validateSort(sort);

  const t = await getTranslations({ locale, namespace: 'topics' });
  const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [totalCount, openingsForSquare] = await Promise.all([
    getPostCountForSquare(square),
    getOpeningsByFirstMoveSquare(square),
  ]);

  const { totalPages, currentPage, limit, offset } = getPaginationParams(
    page,
    totalCount,
    TOPIC_PAGE_SIZE
  );

  const posts = await getPostsWithReplyMetaPaginated(square, limit, offset, user?.id, sortBy);

  // Fetch attachments for the visible page of posts and pre-resolve each
  // to a ReactNode upstream — PostCard is a client component and cannot
  // call the server-only `getAttachmentsForPosts` itself. Posts with no
  // attachment row drop out of the map.
  const postIds = posts.map((p) => p.id);
  const attachments = postIds.length > 0 ? await getAttachmentsForPosts(postIds) : new Map();
  const tVideo = await getTranslations({ locale, namespace: 'postVideoAttachmentRender' });
  const fallbackVideoTitle = tVideo('fallbackTitle');

  const MAX_OPENING_CARDS = 3;
  const visibleOpenings = openingsForSquare.slice(0, MAX_OPENING_CARDS);
  const hasMoreOpenings = openingsForSquare.length > MAX_OPENING_CARDS;

  const buildHref = (p: number) =>
    buildPaginationHref(locale, `/topics/squares/${square}`, p, sortBy);

  const topicHeader = (
    <>
      {currentPage === 1 && <SquareHighlightBoard square={square} locale={locale} />}

      {visibleOpenings.length > 0 && (
        <div className="space-y-3">
          <SectionTitle>{t('squares.openingsLink', { square })}</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleOpenings.map((opening) => (
              <OpeningCard
                key={opening.id}
                opening={opening}
                displayName={getOpeningDisplayName(nameT, opening.slug, opening.name)}
                locale={locale}
              />
            ))}
          </div>
          {hasMoreOpenings && (
            <div className="text-center">
              <Link
                href={`/topics/openings?first_move=${square}`}
                locale={locale}
                className={`inline-flex items-center gap-1 text-sm ${TEXT_LINK_CLASSES}`}
              >
                {t('squares.moreOpenings')}
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );

  const newPostForm = <NewPostForm locale={locale} square={square} />;

  const communitySection = (
    <section className="space-y-4">
      <SectionTitle>{t('communityThoughts')}</SectionTitle>

      {user && totalCount === 0 ? (
        newPostForm
      ) : (
        <JoinConversationToggle count={totalCount} joinLabel={t('joinConversation')}>
          {newPostForm}
        </JoinConversationToggle>
      )}

      {totalCount > 0 && (
        <SortSelect
          basePath={`/topics/squares/${square}`}
          translationKey="topics.squares.sort"
          currentSort={sortBy}
        />
      )}
    </section>
  );

  return (
    <TopicListPageLayout
      locale={locale}
      pageTitle={t('squares.pageTitle')}
      sectionTitle={square}
      topicHeader={topicHeader}
      adMiddle={
        (IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_MIDDLE) && (
          <AdSenseGuard slot="content-middle" slotId={ADSENSE_SLOT_CONTENT_MIDDLE ?? ''} />
        )
      }
      adBottom={
        (IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )
      }
      communitySection={communitySection}
      hasPosts={posts.length > 0}
      postCards={posts.map((post) => {
        const att = attachments.get(post.id);
        return (
          <PostCard
            key={post.id}
            post={post}
            locale={locale}
            square={square}
            attachment={att ? renderAttachment(att, fallbackVideoTitle) : undefined}
          />
        );
      })}
      pagination={{ currentPage, totalPages, buildHref }}
      breadcrumbItems={[
        { label: t('title'), href: '/topics' },
        { label: t('squares.title'), href: '/topics/squares' },
        { label: square },
      ]}
    />
  );
}

/**
 * Mirrors `SquarePostsContent`'s resolved DOM — PageTitle → square
 * SectionTitle → SquareHighlightBoard → linked-openings grid → community
 * thoughts → posts feed — to minimise CLS. The square name and the
 * openings-link heading are runtime values, so they render as placeholder
 * bars.
 */
async function SquarePostsSkeleton() {
  const locale = await getLocaleFromPathnameHeader();
  const t = await getTranslations({ locale, namespace: 'topics' });

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

/**
 * Deliberately NOT a segment-level `loading.tsx` — see the matching comment
 * on `topics/page.tsx` for the full rationale. A file-based `loading.tsx`
 * here would also wrap the deeper `posts/[postId]` detail route, causing a
 * double-skeleton flash when a `PostCard` links straight into a post.
 */
export default function SquarePostsPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<SquarePostsSkeleton />}>
      <SquarePostsContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
