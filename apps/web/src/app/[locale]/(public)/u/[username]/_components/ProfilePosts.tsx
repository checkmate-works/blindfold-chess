import { Link } from '@/i18n/routing';

import { TopicPostCard } from '@/app/[locale]/(public)/(home)/_components/TopicPostCard';
import type { ProfilePostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/shared';
import { PaginationNav } from '@/app/[locale]/_components';

type Props = {
  posts: ProfilePostWithReplyMeta[];
  totalCount: number;
  problemsCount: number;
  activeTab: string;
  currentPage: number;
  totalPages: number;
  locale: string;
  buildHref: (page: number) => string;
  buildTabHref: (tab: string) => string;
  labels: {
    topicsTab: string;
    problemsTab: string;
    noTopicPosts: string;
    showMore: string;
    justNow: (topicType: string) => string;
  };
  children?: React.ReactNode;
};

export function ProfilePosts({
  posts,
  totalCount,
  problemsCount,
  activeTab,
  currentPage,
  totalPages,
  locale,
  buildHref,
  buildTabHref,
  labels,
  children,
}: Props) {
  return (
    <div>
      <div className="border-b border-border">
        <nav className="flex">
          <Link
            href={buildTabHref('topics')}
            locale={locale}
            className={`px-4 py-2 text-sm font-bold ${
              activeTab === 'topics'
                ? 'text-foreground border-b-2 border-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {labels.topicsTab} <span className="font-normal">{totalCount}</span>
          </Link>
          <Link
            href={buildTabHref('problems')}
            locale={locale}
            className={`px-4 py-2 text-sm font-bold ${
              activeTab === 'problems'
                ? 'text-foreground border-b-2 border-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {labels.problemsTab} <span className="font-normal">{problemsCount}</span>
          </Link>
        </nav>
      </div>

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
      ) : (
        children
      )}
    </div>
  );
}
