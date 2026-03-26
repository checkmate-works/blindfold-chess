import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getAuthenticatedUser } from '@/lib/auth';
import { getPaginationParams } from '@/lib/pagination';

import { TopicPostCard } from '@/app/[locale]/(public)/(home)/_components/TopicPostCard';
import {
  getLikedPostCountByUser,
  getLikedPostsByUser,
} from '@/app/[locale]/(public)/topics/_lib/queries';
import { TOPIC_PAGE_SIZE } from '@/app/[locale]/(public)/topics/_lib/pagination';
import { Divider, PagePanel, PageTitle, PaginationNav } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.mypageLikes' });

  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

export default async function LikesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypageLikes' });
  const tTopics = await getTranslations({ locale, namespace: 'topics' });
  const tSquares = await getTranslations({ locale, namespace: 'topics.squares' });
  const tOpenings = await getTranslations({ locale, namespace: 'topics.openings' });

  const user = await getAuthenticatedUser();

  const { page } = await searchParamsCache.parse(searchParams);

  const totalCount = await getLikedPostCountByUser(user.id);
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    TOPIC_PAGE_SIZE
  );
  const posts = await getLikedPostsByUser(user.id, limit, offset);

  const buildHref = (p: number) => {
    const qs = p > 1 ? `?page=${p}` : '';
    return `/${locale}/mypage/likes${qs}`;
  };

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>
      <PagePanel>
        {posts.length === 0 ? (
          <p className="text-muted-foreground">{t('empty')}</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const tTopic = post.topicType === 'opening' ? tOpenings : tSquares;
              return (
                <TopicPostCard
                  key={post.id}
                  post={post}
                  locale={locale}
                  showMoreLabel={tTopics('showMore')}
                  justNowLabel={tTopic('justNow')}
                  newReplyTemplate={tTopic('newReply', { time: '{time}' })}
                />
              );
            })}
          </div>
        )}

        <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />

        <Divider />

        <Breadcrumb
          locale={locale}
          items={[{ label: t('breadcrumbMypage'), href: '/mypage' }, { label: t('title') }]}
        />
      </PagePanel>
    </div>
  );
}
