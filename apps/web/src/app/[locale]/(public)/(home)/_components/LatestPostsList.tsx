import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { ListLink, ListLinkContainer, SectionTitle } from '@/app/[locale]/_components';

import { getCategoryIcon } from '../../posts/_lib/constants';
import { getLatestPublishedPosts } from '../../posts/_lib/queries';

const LATEST_POSTS_DISPLAY_COUNT = 5;

type Props = {
  locale: string;
  title: string;
};

export async function LatestPostsList({ locale, title }: Props) {
  const posts = await getLatestPublishedPosts(LATEST_POSTS_DISPLAY_COUNT + 1);
  const t = await getTranslations({ locale, namespace: 'posts' });

  if (posts.length === 0) {
    return null;
  }

  const hasMore = posts.length > LATEST_POSTS_DISPLAY_COUNT;
  const displayPosts = hasMore ? posts.slice(0, LATEST_POSTS_DISPLAY_COUNT) : posts;

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6 md:p-8 shadow-sm space-y-4">
      <SectionTitle>{title}</SectionTitle>
      <ListLinkContainer>
        {displayPosts.map((post) => {
          const publishedDate = post.publishedAt
            ? new Date(post.publishedAt).toLocaleDateString(locale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : undefined;

          return (
            <ListLink
              key={post.id}
              href={`/posts/${post.category.slug}/${post.slug}`}
              icon={getCategoryIcon(post.category.slug)}
              title={post.title}
              meta={publishedDate}
              locale={locale}
              isPinned={post.pinnedAt !== null}
            />
          );
        })}
      </ListLinkContainer>
      {hasMore && (
        <div className="text-center">
          <Link
            href="/posts"
            locale={locale}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('morePosts')}
          </Link>
        </div>
      )}
    </div>
  );
}
