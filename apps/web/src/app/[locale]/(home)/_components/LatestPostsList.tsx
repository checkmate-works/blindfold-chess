import { ListLink, ListLinkContainer, SectionTitle } from '@/app/[locale]/_components';

import { getCategoryIcon } from '../../posts/_lib/constants';
import { getLatestPublishedPosts } from '../../posts/_lib/queries';

type Props = {
  locale: string;
  title: string;
};

export async function LatestPostsList({ locale, title }: Props) {
  const posts = await getLatestPublishedPosts(3);

  if (posts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <SectionTitle>{title}</SectionTitle>
      <ListLinkContainer>
        {posts.map((post) => {
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
            />
          );
        })}
      </ListLinkContainer>
    </div>
  );
}
