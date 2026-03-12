import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { SectionTitle } from '@/app/[locale]/_components';

import { getRecentPostsAcrossSquares } from '../../topics/squares/_lib/queries';
import { TopicPostCard } from './TopicPostCard';

const DISPLAY_COUNT = 3;

type Props = {
  locale: string;
  title: string;
};

export async function LatestTopicPostsList({ locale, title }: Props) {
  const posts = await getRecentPostsAcrossSquares(DISPLAY_COUNT + 1);
  const t = await getTranslations({ locale, namespace: 'topics' });

  if (posts.length === 0) {
    return null;
  }

  const hasMore = posts.length > DISPLAY_COUNT;
  const displayPosts = hasMore ? posts.slice(0, DISPLAY_COUNT) : posts;

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6 md:p-8 shadow-sm space-y-4">
      <SectionTitle>{title}</SectionTitle>
      <div className="space-y-3">
        {displayPosts.map((post) => (
          <TopicPostCard key={post.id} post={post} locale={locale} topicKey={post.topicKey} />
        ))}
      </div>
      {hasMore && (
        <div className="text-center">
          <Link
            href="/topics/squares"
            locale={locale}
            className="text-sm text-link-primary hover:text-link-primary/80 transition-colors"
          >
            {t('moreTopicPosts')}
          </Link>
        </div>
      )}
    </div>
  );
}
