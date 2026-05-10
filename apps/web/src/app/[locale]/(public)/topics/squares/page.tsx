import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ADSENSE_SLOT_CONTENT_BOTTOM, ADSENSE_SLOT_CONTENT_MIDDLE, IS_LOCAL_DEV } from '@/config';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';
import { getPaginationParams } from '@/lib/pagination';
import { createClient } from '@/lib/supabase/server';

import { renderAttachment } from '@/app/[locale]/(public)/topics/_components/render-attachment';
import { TOPIC_PAGE_SIZE } from '@/app/[locale]/(public)/topics/_lib/pagination';
import { PageLayout, PaginationNav, SectionTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

import { PostCard, SquareBoard } from './_components';
import { getPostCountAcrossSquares, getPostsAcrossSquaresPaginated } from './_lib/queries';

export const dynamic = 'force-dynamic';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.topicsSquares' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'topics/squares', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function SquaresPage({ params, searchParams }: Props) {
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
      {currentPage === 1 && (
        <>
          <SectionTitle>{t('squares.sectionTitle')}</SectionTitle>
          <SquareBoard locale={locale} />
        </>
      )}

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_MIDDLE) && (
        <AdSenseGuard slot="content-middle" slotId={ADSENSE_SLOT_CONTENT_MIDDLE ?? ''} />
      )}

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

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </PageLayout>
  );
}
