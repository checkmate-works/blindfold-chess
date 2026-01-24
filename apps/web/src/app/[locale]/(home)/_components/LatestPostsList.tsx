import { Link } from '@/i18n/routing';

import { SectionTitle } from '@/app/[locale]/_components';

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
      <ul className="bg-card border border-border rounded-md overflow-hidden">
        {posts.map((post) => {
          const publishedDate = post.publishedAt
            ? new Date(post.publishedAt).toLocaleDateString(locale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : null;

          return (
            <li
              key={post.id}
              className="border-b border-border last:border-b-0 hover:bg-muted transition-colors"
            >
              <Link
                href={`/posts/${post.category.slug}/${post.slug}`}
                locale={locale}
                className="block px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl flex-shrink-0">
                    {getCategoryIcon(post.category.slug)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-foreground font-medium truncate block">{post.title}</span>
                  </div>
                  {publishedDate && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {publishedDate}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
