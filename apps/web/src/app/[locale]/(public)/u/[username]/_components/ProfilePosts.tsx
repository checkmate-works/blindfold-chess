import { TopicPostCard } from '@/app/[locale]/(public)/(home)/_components/TopicPostCard';
import type { ProfilePostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/shared';
import { PaginationNav } from '@/app/[locale]/_components/PaginationNav';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ProfileTabBar } from './ProfileTabBar';

type Props = {
  posts: ProfilePostWithReplyMeta[];
  totalCount: number;
  problemsCount: number;
  gamesCount: number;
  activeTab: string;
  currentPage: number;
  totalPages: number;
  locale: Locale;
  buildHref: (page: number) => string;
  buildTabHref: (tab: string) => string;
  labels: {
    topicsTab: string;
    problemsTab: string;
    gamesTab: string;
    noTopicPosts: string;
    showMore: string;
    justNow: (topicType: string) => string;
  };
  /** Games-tab content, rendered when `activeTab === 'games'`. */
  gamesSlot?: React.ReactNode;
};

export function ProfilePosts({
  posts,
  totalCount,
  problemsCount,
  gamesCount,
  activeTab,
  currentPage,
  totalPages,
  locale,
  buildHref,
  buildTabHref,
  labels,
  gamesSlot,
}: Props) {
  return (
    <div>
      <ProfileTabBar
        topicsCount={totalCount}
        problemsCount={problemsCount}
        gamesCount={gamesCount}
        activeTab={activeTab}
        locale={locale}
        buildTabHref={buildTabHref}
        labels={{
          topicsTab: labels.topicsTab,
          problemsTab: labels.problemsTab,
          gamesTab: labels.gamesTab,
        }}
      />

      {activeTab === 'topics' ? (
        <>
          <div className="mt-4 space-y-3">
            {posts.length > 0 ? (
              posts.map((post) => (
                <TopicPostCard
                  key={post.id}
                  post={post}
                  locale={locale}
                  showMoreLabel={labels.showMore}
                  justNowLabel={labels.justNow(post.topicType)}
                  variant="card"
                />
              ))
            ) : (
              <p className="py-8 text-center text-muted-foreground">{labels.noTopicPosts}</p>
            )}
          </div>

          <PaginationNav
            locale={locale}
            currentPage={currentPage}
            totalPages={totalPages}
            buildHref={buildHref}
          />
        </>
      ) : (
        gamesSlot
      )}
    </div>
  );
}
