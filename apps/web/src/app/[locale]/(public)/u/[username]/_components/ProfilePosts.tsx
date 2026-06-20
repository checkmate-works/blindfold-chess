import { TopicPostCard } from '@/app/[locale]/(public)/(home)/_components/TopicPostCard';
import type { ProfilePostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/shared';
import { PaginationNav } from '@/app/[locale]/_components';
import { LinkTabs } from '@/app/[locale]/_components/LinkTabs';
import type { LinkTabItem } from '@/app/[locale]/_components/LinkTabs';

type Props = {
  posts: ProfilePostWithReplyMeta[];
  totalCount: number;
  problemsCount: number;
  gamesCount: number;
  activeTab: string;
  currentPage: number;
  totalPages: number;
  locale: string;
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
  /** Problems-tab content, rendered when `activeTab === 'problems'`. */
  problemsSlot?: React.ReactNode;
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
  problemsSlot,
  gamesSlot,
}: Props) {
  const tabItems: LinkTabItem[] = [
    {
      value: 'topics',
      href: buildTabHref('topics'),
      label: (
        <>
          {labels.topicsTab} <span className="font-normal">{totalCount}</span>
        </>
      ),
    },
    {
      value: 'problems',
      href: buildTabHref('problems'),
      label: (
        <>
          {labels.problemsTab} <span className="font-normal">{problemsCount}</span>
        </>
      ),
    },
    {
      value: 'games',
      href: buildTabHref('games'),
      label: (
        <>
          {labels.gamesTab} <span className="font-normal">{gamesCount}</span>
        </>
      ),
    },
  ];

  return (
    <div>
      <LinkTabs items={tabItems} activeValue={activeTab} locale={locale} variant="underline" />

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

          <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
        </>
      ) : activeTab === 'games' ? (
        gamesSlot
      ) : (
        problemsSlot
      )}
    </div>
  );
}
