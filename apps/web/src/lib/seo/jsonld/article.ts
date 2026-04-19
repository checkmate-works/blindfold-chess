import { LANGUAGE_TAGS } from '@/i18n/language-tags';

import type { Locale } from '@/app/[locale]/_lib/types';

import { AUTHOR_NAME, SITE_URL } from './base';

export type ArticleData = {
  title: string;
  description: string;
  slug: string;
  category: string;
  publishedAt: string;
  locale: Locale;
};

/**
 * Article schema for learn articles
 * @see https://schema.org/Article
 */
export function generateArticleSchema(article: ArticleData) {
  const articleUrl = `${SITE_URL}/${article.locale}/learn/${article.category}/${article.slug}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
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
      '@id': articleUrl,
    },
    inLanguage: LANGUAGE_TAGS[article.locale],
  };
}
