import { LANGUAGE_TAGS } from '@/i18n/language-tags';

import type { Locale } from '@/app/[locale]/_lib/types';

import { AUTHOR_NAME, SITE_URL } from './base';

export type LearningResourceData = {
  /** Visible title of the resource (e.g. "5th Kyū Guide"). */
  name: string;
  /** Meta-description equivalent. */
  description: string;
  /** Absolute URL of the current page. */
  url: string;
  /** Supported app locale. Mapped via `LANGUAGE_TAGS` to a BCP 47 tag (e.g. `en` -> `en-US`). */
  inLanguage: Locale;
  /** Human-readable rank/level label (e.g. "5th Kyū"). */
  educationalLevel: string;
  /** `https://schema.org/LearningResource` subtype. */
  learningResourceType: 'Tutorial' | 'Guide' | 'Course';
  /** Optional topic/skill description (Schema.org `teaches`). */
  teaches?: string;
  /** ISO 8601 string; omitted from output when undefined. */
  datePublished?: string;
  /** ISO 8601 string; omitted from output when undefined. */
  dateModified?: string;
  /** Author override. Defaults to site Organization. */
  author?: { name: string; url?: string };
  /** Publisher override. Defaults to site Organization. */
  publisher?: { name: string; url?: string; logo?: string };
  /** Optional hero/thumbnail absolute URL. */
  image?: string;
};

/**
 * LearningResource schema for rank/chapter guide pages.
 *
 * @see https://schema.org/LearningResource
 *
 * Fields that are not provided by the caller (`datePublished`, `dateModified`,
 * `teaches`, `image`) are omitted from the output entirely rather than being
 * emitted as `undefined` — that keeps the rendered JSON-LD small and avoids
 * Google Search Console flagging "empty property" warnings.
 *
 * `author` and `publisher` default to the site Organization so every call
 * site gets sensible publisher/author attribution for free; pass overrides
 * only when the guide is authored by a different entity.
 */
export function generateLearningResourceSchema(params: LearningResourceData) {
  const authorName = params.author?.name ?? AUTHOR_NAME;
  const authorUrl = params.author?.url ?? SITE_URL;
  const publisherName = params.publisher?.name ?? AUTHOR_NAME;
  const publisherUrl = params.publisher?.url ?? SITE_URL;
  const publisherLogo = params.publisher?.logo ?? `${SITE_URL}/logo.png`;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: params.name,
    description: params.description,
    url: params.url,
    inLanguage: LANGUAGE_TAGS[params.inLanguage],
    educationalLevel: params.educationalLevel,
    learningResourceType: params.learningResourceType,
    author: {
      '@type': 'Organization',
      name: authorName,
      url: authorUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: publisherName,
      url: publisherUrl,
      logo: {
        '@type': 'ImageObject',
        url: publisherLogo,
      },
    },
  };

  if (params.teaches !== undefined) schema.teaches = params.teaches;
  if (params.datePublished !== undefined) schema.datePublished = params.datePublished;
  if (params.dateModified !== undefined) schema.dateModified = params.dateModified;
  if (params.image !== undefined) schema.image = params.image;

  return schema;
}
