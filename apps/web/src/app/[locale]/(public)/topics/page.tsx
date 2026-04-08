import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getPaginationParams } from '@/lib/pagination';
import { createClient } from '@/lib/supabase/server';

import { TopicPostCard } from '@/app/[locale]/(public)/(home)/_components/TopicPostCard';
import { TOPIC_PAGE_SIZE } from '@/app/[locale]/(public)/topics/_lib/pagination';
import {
  CardLink,
  Divider,
  PagePanel,
  PageTitle,
  PaginationNav,
  SectionTitle,
} from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps as Props } from '@/app/[locale]/_lib/types';

import { getPostCountAcrossTopics, getPostsAcrossTopicsPaginated } from './_lib/queries';

export const dynamic = 'force-dynamic';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.topics' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({ locale, path: 'topics', title, description }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function TopicsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page } = await searchParamsCache.parse(searchParams);
  const t = await getTranslations({ locale, namespace: 'topics' });
  const tSquares = await getTranslations({ locale, namespace: 'topics.squares' });
  const tOpenings = await getTranslations({ locale, namespace: 'topics.openings' });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const totalCount = await getPostCountAcrossTopics();
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    TOPIC_PAGE_SIZE
  );

  const recentPosts = await getPostsAcrossTopicsPaginated(limit, offset, user?.id);

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/${locale}/topics${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <PagePanel>
        {currentPage === 1 && (
          <div className="space-y-4">
            <CardLink
              href="/topics/squares"
              icon="♟"
              title={t('categories.squares.title')}
              description={t('categories.squares.description')}
              locale={locale}
            />
            <CardLink
              href="/topics/openings"
              icon="♞"
              title={t('categories.openings.title')}
              description={t('categories.openings.description')}
              locale={locale}
            />
          </div>
        )}

        <SectionTitle>{t('recentPosts')}</SectionTitle>

        {recentPosts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t('noRecentPosts')}</p>
        ) : (
          <div className="space-y-3">
            {recentPosts.map((post) => {
              const tTopic = post.topicType === 'opening' ? tOpenings : tSquares;
              return (
                <TopicPostCard
                  key={post.id}
                  post={post}
                  locale={locale}
                  showMoreLabel={t('showMore')}
                  justNowLabel={tTopic('justNow')}
                  newReplyTemplate={tTopic('newReply', { time: '{time}' })}
                  variant="card"
                />
              );
            })}
          </div>
        )}

        <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />

        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )}

        <Divider />

        <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
