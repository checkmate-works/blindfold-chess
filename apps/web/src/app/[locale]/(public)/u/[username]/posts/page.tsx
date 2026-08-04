/**
 * Profile Posts Archive (投稿アーカイブ)
 *
 * @description
 * The complete, paginated list of one member's topic posts. Split out of the
 * main profile page when that page became a timeline: the timeline shows
 * recent activity and cannot be paged backwards indefinitely, so the archives
 * carry the crawlable, page-numbered links instead.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { TopicPostCard } from '@/app/[locale]/(public)/(home)/_components/TopicPostCard';
import { getPostsByUserId } from '@/app/[locale]/(public)/topics/_lib/user-post-queries';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ProfileShell } from '../_components/ProfileShell';
import { buildProfileArchiveMetadata } from '../_lib/archive-metadata';
import { loadProfileArchiveContext } from '../_lib/load-archive-context';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 5;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

type Props = {
  params: Promise<{ locale: Locale; username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, username } = await params;

  return buildProfileArchiveMetadata({ locale, username, labelKey: 'topicsTab', segment: 'posts' });
}

export default async function ProfilePostsPage({ params, searchParams }: Props) {
  const { locale, username } = await params;

  const [context, parsedParams, t, tTopics, tSquares, tOpenings] = await Promise.all([
    loadProfileArchiveContext({ locale, username }),
    searchParamsCache.parse(searchParams),
    getTranslations({ locale, namespace: 'publicProfile' }),
    getTranslations({ locale, namespace: 'topics' }),
    getTranslations({ locale, namespace: 'topics.squares' }),
    getTranslations({ locale, namespace: 'topics.openings' }),
  ]);

  const totalPages = Math.ceil(context.shell.postsCount / PAGE_SIZE);
  const currentPage = Math.max(1, Math.min(parsedParams.page, totalPages || 1));

  const posts =
    context.shell.postsCount > 0
      ? await getPostsByUserId(
          context.profile.id,
          context.currentUserId,
          PAGE_SIZE,
          (currentPage - 1) * PAGE_SIZE
        )
      : [];

  const buildHref = (p: number) => `/${locale}/u/${username}/posts${p > 1 ? `?page=${p}` : ''}`;

  return (
    <ProfileShell context={context} locale={locale} activeTab="topics">
      <div className="mt-4 space-y-3">
        {posts.length > 0 ? (
          posts.map((post) => (
            <TopicPostCard
              key={post.id}
              post={post}
              locale={locale}
              showMoreLabel={tTopics('showMore')}
              justNowLabel={
                post.topicType === 'opening' ? tOpenings('justNow') : tSquares('justNow')
              }
              variant="card"
            />
          ))
        ) : (
          <p className="py-8 text-center text-muted-foreground">{t('noTopicPosts')}</p>
        )}
      </div>

      <PaginationNav
        locale={locale}
        currentPage={currentPage}
        totalPages={totalPages}
        buildHref={buildHref}
      />
    </ProfileShell>
  );
}
