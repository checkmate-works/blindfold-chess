import { LANGUAGE_TAGS } from '@/i18n/language-tags';

import type { Locale } from '@/app/[locale]/_lib/types';

import { AUTHOR_NAME, SITE_URL } from './base';

export type BlogPostData = {
  title: string;
  description: string;
  slug: string;
  publishedAt: Date | null;
  /**
   * Last write to the article row that is actually rendered — under locale
   * fallback that is the fallback locale's row, not the requested one's.
   * Emitted as `dateModified` only when it is later than `publishedAt`; see
   * `resolveDateModified`.
   */
  updatedAt?: Date | null;
  locale: Locale;
};

/**
 * `dateModified` must never predate `datePublished`: schema.org consumers read
 * the pair as "published, then revised", so a modification before publication
 * is a contradiction they may flag or discard.
 *
 * The inversion is reachable. `publishedAt` is a datetime the admin types into
 * the publish form, not the moment of the write, while every admin save sets
 * `updatedAt` to the save time. Publishing with a date ahead of the save — and
 * making no later edit — leaves `updatedAt` earlier than `publishedAt`. The
 * page has then not changed since the date it claims to have gone public, so
 * the key is omitted rather than clamped to `datePublished`, which would only
 * duplicate it.
 *
 * The converse is accepted as-is: the publish save itself bumps `updatedAt`, so
 * an article published without a later edit usually reports a `dateModified`
 * minutes or days after `datePublished`. That still orders correctly, and
 * telling a content edit apart from a metadata-only save is not something the
 * row records.
 *
 * With no `publishedAt` there is no ordering to violate, so `updatedAt` is
 * emitted as-is.
 */
function resolveDateModified(post: BlogPostData): string | undefined {
  if (!post.updatedAt) return undefined;
  if (post.publishedAt && post.updatedAt.getTime() <= post.publishedAt.getTime()) {
    return undefined;
  }
  return post.updatedAt.toISOString();
}

/**
 * BlogPosting schema for blog posts
 * @see https://schema.org/BlogPosting
 */
export function generateBlogPostingSchema(post: BlogPostData) {
  const postUrl = `${SITE_URL}/${post.locale}/articles/${post.slug}`;
  const dateModified = resolveDateModified(post);

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt ? post.publishedAt.toISOString() : undefined,
    // Omitted rather than `undefined`, matching `generateLearningResourceSchema`.
    ...(dateModified !== undefined && { dateModified }),
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
    inLanguage: LANGUAGE_TAGS[post.locale],
  };
}
