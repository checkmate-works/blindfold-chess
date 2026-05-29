import { getTranslations } from 'next-intl/server';

import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getAuthenticatedUser } from '@/lib/auth';
import { getPaginationParams } from '@/lib/pagination';

import { TopicPostCard } from '@/app/[locale]/(public)/(home)/_components/TopicPostCard';
import { TOPIC_PAGE_SIZE } from '@/app/[locale]/(public)/topics/_lib/pagination';
import {
  getPostCountByUserId,
  getPostsByUserId,
} from '@/app/[locale]/(public)/topics/_lib/user-post-queries';
import { PageLayout, PaginationNav, SectionTitle } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps } from '@/app/[locale]/_lib/types';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

type Props = LocaleSearchPageProps;

export function generateMetadata({ params }: Props) {
  return createPageMetadata({
    params,
    namespace: 'metadata.mypagePosts',
    path: 'mypage/posts',
    noIndex: true,
  });
}

export default async function PostsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypagePosts' });
  const tTopics = await getTranslations({ locale, namespace: 'topics' });
  const tSquares = await getTranslations({ locale, namespace: 'topics.squares' });
  const tOpenings = await getTranslations({ locale, namespace: 'topics.openings' });

  const user = await getAuthenticatedUser();

  const { page } = await searchParamsCache.parse(searchParams);

  const totalCount = await getPostCountByUserId(user.id);
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    TOPIC_PAGE_SIZE
  );
  const posts = await getPostsByUserId(user.id, user.id, limit, offset);

  const buildHref = (p: number) => {
    const qs = p > 1 ? `?page=${p}` : '';
    return `/${locale}/mypage/posts${qs}`;
  };

  return (
    <PageLayout
      title={t('title')}
      locale={locale}
      breadcrumb={[{ label: t('breadcrumbMypage'), href: '/mypage' }, { label: t('title') }]}
    >
      <SectionTitle>{t('sectionTitle')}</SectionTitle>
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
                variant="card"
              />
            );
          })}
        </div>
      )}

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </PageLayout>
  );
}
