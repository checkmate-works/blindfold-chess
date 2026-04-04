import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Link } from '@/i18n/routing';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { paginateItems } from '@/lib/pagination';
import { createClient } from '@/lib/supabase/server';

import { TopicListPageLayout } from '@/app/[locale]/(public)/topics/_components/TopicListPageLayout';
import {
  TOPIC_PAGE_SIZE,
  buildPaginationHref,
  validateSort,
} from '@/app/[locale]/(public)/topics/_lib/pagination';
import { OpeningCard } from '@/app/[locale]/(public)/topics/openings/_components';
import { getOpeningDisplayName } from '@/app/[locale]/(public)/topics/openings/_lib/get-opening-display-name';
import { getOpeningsByFirstMoveSquare } from '@/app/[locale]/(public)/topics/openings/_lib/queries';
import { SectionTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SortTabs } from '../_components';
import { getPostsWithReplyMeta } from '../_lib/queries';
import { isValidSquare } from '../_lib/squares';
import { PostCard, SquareHighlightBoard } from './_components';

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
    title,
    description,
  };
}

export default async function SquarePostsPage({ params, searchParams }: Props) {
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
  const allPosts = await getPostsWithReplyMeta(square, user?.id, sortBy);
  const openingsForSquare = await getOpeningsByFirstMoveSquare(square);

  const {
    totalCount,
    totalPages,
    currentPage,
    paginatedItems: posts,
  } = paginateItems(allPosts, TOPIC_PAGE_SIZE, page);

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
                className="inline-flex items-center gap-1 text-sm text-link-primary hover:underline"
              >
                {t('squares.moreOpenings')}
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <TopicListPageLayout
      locale={locale}
      pageTitle={t('squares.pageTitle')}
      sectionTitle={square}
      topicHeader={topicHeader}
      postCountText={t('squares.postCount', { count: totalCount })}
      newPostButton={{ href: `/topics/squares/${square}/new`, label: t('squares.newPost') }}
      sortTabs={<SortTabs square={square} locale={locale} />}
      hasPosts={posts.length > 0}
      noPostsText={t('squares.noPosts')}
      postCards={posts.map((post) => (
        <PostCard key={post.id} post={post} locale={locale} square={square} />
      ))}
      pagination={{ currentPage, totalPages, buildHref }}
      breadcrumbItems={[
        { label: t('title'), href: '/topics' },
        { label: t('squares.title'), href: '/topics/squares' },
        { label: square },
      ]}
    />
  );
}
