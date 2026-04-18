import { AUTHOR_NAME, LANGUAGE_MAP, SITE_URL } from './base';

export type BlogPostData = {
  title: string;
  description: string;
  slug: string;
  publishedAt: Date | null;
  locale: string;
};

/**
 * BlogPosting schema for blog posts
 * @see https://schema.org/BlogPosting
 */
export function generateBlogPostingSchema(post: BlogPostData) {
  const postUrl = `${SITE_URL}/${post.locale}/articles/${post.slug}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt ? post.publishedAt.toISOString() : undefined,
    author: {
      '@type': 'Organization',
      name: AUTHOR_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: AUTHOR_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
    inLanguage: LANGUAGE_MAP[post.locale] ?? 'en-US',
  };
}
