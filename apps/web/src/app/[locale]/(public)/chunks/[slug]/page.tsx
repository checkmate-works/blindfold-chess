import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { getChunkBySlug, getLinkedPositionsForChunk } from '@/lib/chunks/queries';
import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';
import { getPaginationParams } from '@/lib/pagination';
import { getPositionDetailPath } from '@/lib/positions/routes';
import { parsePositionType } from '@/lib/positions/types';
import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';
import { createClient } from '@/lib/supabase/server';

import { SortSelect } from '@/app/[locale]/(public)/topics/_components/SortSelect';
import {
  TOPIC_PAGE_SIZE,
  buildPaginationHref,
  validateSort,
} from '@/app/[locale]/(public)/topics/_lib/pagination';
import {
  getPostCountByTopicKey,
  getPostsWithReplyMetaPaginatedByTopicKey,
} from '@/app/[locale]/(public)/topics/_lib/queries';
import { PageLayout, PaginationNav, SectionTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { NewPostForm } from './_components/NewPostForm';
import { PostCard } from './_components/PostCard';

export const dynamic = 'force-dynamic';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  sort: parseAsString.withDefault('new'),
});

type Props = {
  params: Promise<{
    locale: Locale;
    slug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const chunk = await getChunkBySlug(slug);

  if (!chunk) {
    return {
      title: resolveTitle('Not Found', locale),
    };
  }

  return {
    title: resolveTitle(chunk.title, locale),
    ...(chunk.description && { description: chunk.description }),
    ...generateCanonicalMetadata({
      locale,
      path: `chunks/${slug}`,
      title: chunk.title,
      description: chunk.description ?? undefined,
    }),
  };
}

export default async function ChunkDetailPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const chunk = await getChunkBySlug(slug);

  if (!chunk) {
    notFound();
  }

  const { page, sort } = await searchParamsCache.parse(searchParams);
  const sortBy = validateSort(sort);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [linkedPositions, totalCount, t] = await Promise.all([
    getLinkedPositionsForChunk(chunk.id),
    getPostCountByTopicKey('chunk', slug),
    getTranslations({ locale, namespace: 'topics.chunks' }),
  ]);

  const { totalPages, currentPage, limit, offset } = getPaginationParams(
    page,
    totalCount,
    TOPIC_PAGE_SIZE
  );

  const posts = await getPostsWithReplyMetaPaginatedByTopicKey(
    'chunk',
    slug,
    limit,
    offset,
    user?.id,
    sortBy
  );

  const attachments = await getAttachmentsForPosts(posts.map((p) => p.id));

  const buildHref = (p: number) => buildPaginationHref(locale, `/chunks/${slug}`, p, sortBy);

  return (
    <PageLayout
      title={chunk.title}
      locale={locale}
      breadcrumb={[{ label: 'Chunks', href: '/chunks' }, { label: chunk.title }]}
    >
      {chunk.description && (
        <>
          <SectionTitle>Description</SectionTitle>
          <p className="text-muted-foreground">{chunk.description}</p>
        </>
      )}

      <div className="max-w-xs mx-auto">
        <ThemedBoardThumbnail fen={chunk.representativeFen} className="w-full" />
      </div>

      {linkedPositions.length > 0 && (
        <>
          <SectionTitle>Positions</SectionTitle>
          <p className="text-sm text-muted-foreground">
            Problems where this chunk pattern is effective.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {linkedPositions.map((position) => {
              const positionType = parsePositionType(position.type);
              const detailPath = positionType
                ? getPositionDetailPath(positionType, position.id)
                : null;
              const cardContent = (
                <>
                  <ThemedBoardThumbnail fen={position.fen} className="w-full mb-2" />
                  <p className="text-sm font-medium truncate">{position.title}</p>
                </>
              );
              return detailPath ? (
                <Link
                  key={position.id}
                  href={`/${locale}${detailPath}`}
                  className="block p-4 rounded border border-border hover:bg-muted transition-colors"
                >
                  {cardContent}
                </Link>
              ) : (
                <div key={position.id} className="block p-4 rounded border border-border">
                  {cardContent}
                </div>
              );
            })}
          </div>
        </>
      )}

      <SectionTitle>{t('commentsTitle')}</SectionTitle>

      <p className="text-sm text-muted-foreground">{t('postCount', { count: totalCount })}</p>

      {user ? (
        <NewPostForm locale={locale} slug={slug} />
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link href={`/${locale}/sign-in`} className="text-link-primary hover:underline">
            {t('signInToComment')}
          </Link>
        </p>
      )}

      <SortSelect
        basePath={`/chunks/${slug}`}
        translationKey="topics.chunks.sort"
        currentSort={sortBy}
      />

      {posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} id={`post-${post.id}`}>
              <PostCard
                post={post}
                locale={locale}
                slug={slug}
                attachment={attachments.get(post.id) ?? null}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">{t('noPosts')}</p>
      )}

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}
    </PageLayout>
  );
}
