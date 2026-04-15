import { TopicPostCard } from '@/app/[locale]/(public)/(home)/_components/TopicPostCard';
import type { ProfilePostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/shared';
import { PaginationNav } from '@/app/[locale]/_components';

type Props = {
  posts: ProfilePostWithReplyMeta[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  locale: string;
  buildHref: (page: number) => string;
  labels: {
    topicsTab: string;
    noTopicPosts: string;
    showMore: string;
    justNow: (topicType: string) => string;
    newReply: (topicType: string) => string;
  };
};

export function ProfilePosts({
  posts,
  totalCount,
  currentPage,
  totalPages,
  locale,
  buildHref,
  labels,
}: Props) {
  return (
    <div>
      <div className="border-b border-border">
        <nav className="flex">
          <button className="px-4 py-2 text-sm font-bold text-foreground border-b-2 border-foreground">
            {labels.topicsTab}{' '}
            <span className="text-muted-foreground font-normal">{totalCount}</span>
          </button>
        </nav>
      </div>

      <div className="mt-4 space-y-3">
        {posts.length > 0 ? (
          posts.map((post) => (
            <TopicPostCard
              key={post.id}
              post={post}
              locale={locale}
              showMoreLabel={labels.showMore}
              justNowLabel={labels.justNow(post.topicType)}
              newReplyTemplate={labels.newReply(post.topicType)}
              variant="card"
            />
          ))
        ) : (
          <p className="py-8 text-center text-muted-foreground">{labels.noTopicPosts}</p>
        )}
      </div>

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
