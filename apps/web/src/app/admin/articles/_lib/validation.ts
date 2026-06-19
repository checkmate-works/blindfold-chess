import {
  validateLocale,
  validatePublishedDate,
  validateSlug,
  validateStatus,
  validateTitle,
} from '@/app/admin/_lib/validators';

import type { ContentFormat } from './types';

const VALID_CONTENT_FORMATS: ContentFormat[] = ['markdown', 'tiptap_json'];

type ArticleData = {
  slug: string;
  title: string;
  content: string;
  contentFormat?: ContentFormat;
  locale: string;
  status: string;
  publishedAt: string | null;
  icon: string | null;
};

/**
 * Validate article mutation data before persisting.
 *
 * @returns An error message string if validation fails, or `null` if valid.
 *
 * @remarks
 * - `content` is allowed to be empty when `contentFormat` is `'tiptap_json'`
 *   because content is stored in `contentJson` and `content` is only a
 *   plain-text fallback (may be empty for image-only articles).
 * - `publishedAt` is required when `status` is `'published'`.
 */
export function validateArticleData(data: ArticleData): string | null {
  const slugError = validateSlug(data.slug);
  if (slugError) return slugError;

  const titleError = validateTitle(data.title);
  if (titleError) return titleError;

  if (!data.content && data.contentFormat !== 'tiptap_json') {
    return 'invalid content';
  }

  if (data.contentFormat && !VALID_CONTENT_FORMATS.includes(data.contentFormat)) {
    return 'invalid content format';
  }

  const localeError = validateLocale(data.locale);
  if (localeError) return localeError;

  const statusError = validateStatus(data.status);
  if (statusError) return statusError;

  const publishedError = validatePublishedDate(data.status, data.publishedAt);
  if (publishedError) return publishedError;

  if (data.icon && data.icon.length > 10) {
    return 'invalid icon';
  }

  return null;
}
