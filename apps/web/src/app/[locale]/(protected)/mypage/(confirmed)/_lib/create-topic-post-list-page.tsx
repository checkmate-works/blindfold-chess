import { getTranslations } from 'next-intl/server';

import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getAuthenticatedUser } from '@/lib/auth';
import { getPaginationParams } from '@/lib/pagination';

import { TopicPostCard } from '@/app/[locale]/(public)/(home)/_components/TopicPostCard';
import { TOPIC_PAGE_SIZE } from '@/app/[locale]/(public)/topics/_lib/pagination';
import type { ProfilePostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/shared';
import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocaleSearchPageProps } from '@/app/[locale]/_lib/types';

type CreateTopicPostListPageConfig = {
  /** i18n namespace for the page chrome (title, breadcrumb, sectionTitle, empty). */
  namespace: string;
  /** Metadata namespace passed to createPageMetadata (e.g. `metadata.mypagePosts`). */
  metadataNamespace: string;
  /** Route path used for both the canonical metadata path and pagination hrefs. */
  path: string;
  /** Total number of items for the current user (drives pagination). */
  loadCount: (userId: string) => Promise<number>;
  /** Page of posts to render as TopicPostCards. */
  loadPosts: (userId: string, limit: number, offset: number) => Promise<ProfilePostWithReplyMeta[]>;
};

/**
 * Builds a mypage list page that renders the current user's topic posts as a
 * paginated list of `TopicPostCard`s. The `posts` and `likes` pages are
 * identical apart from their queries, i18n namespace, and route path.
 */
export function createMypageTopicPostListPage(config: CreateTopicPostListPageConfig) {
  const searchParamsCache = createSearchParamsCache({
    page: parseAsInteger.withDefault(1),
  });

  function generateMetadata({ params }: LocaleSearchPageProps) {
    return createPageMetadata({
      params,
      namespace: config.metadataNamespace,
      path: config.path,
      noIndex: true,
    });
  }

  async function Page({ params, searchParams }: LocaleSearchPageProps) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: config.namespace });
    const tTopics = await getTranslations({ locale, namespace: 'topics' });
    const tSquares = await getTranslations({ locale, namespace: 'topics.squares' });
    const tOpenings = await getTranslations({ locale, namespace: 'topics.openings' });

    const user = await getAuthenticatedUser();

    const { page } = await searchParamsCache.parse(searchParams);

    const totalCount = await config.loadCount(user.id);
    const { currentPage, totalPages, limit, offset } = getPaginationParams(
      page,
      totalCount,
      TOPIC_PAGE_SIZE
    );
    const posts = await config.loadPosts(user.id, limit, offset);

    const buildHref = (p: number) => {
      const qs = p > 1 ? `?page=${p}` : '';
      return `/${locale}/${config.path}${qs}`;
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

        <PaginationNav
          currentPage={currentPage}
          totalPages={totalPages}
          buildHref={buildHref}
          locale={locale}
        />
      </PageLayout>
    );
  }

  return { generateMetadata, Page };
}
