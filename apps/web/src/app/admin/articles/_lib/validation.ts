import type { AdminValidationIssue } from '@/app/admin/_lib/action-factories';
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
 * @returns An {@link AdminValidationIssue} naming the offending field if
 *   validation fails, or `null` if valid. The field travels to `ArticleForm`,
 *   which renders the message against that input rather than stranding it
 *   above a full-height editor.
 *
 * @remarks
 * - `content` is allowed to be empty when `contentFormat` is `'tiptap_json'`
 *   because content is stored in `contentJson` and `content` is only a
 *   plain-text fallback (may be empty for image-only articles).
 * - `publishedAt` is required when `status` is `'published'`.
 */
export function validateArticleData(data: ArticleData): AdminValidationIssue | null {
  const slugError = validateSlug(data.slug);
  if (slugError) return { field: 'slug', message: slugError };

  const titleError = validateTitle(data.title);
  if (titleError) return { field: 'title', message: titleError };

  if (!data.content && data.contentFormat !== 'tiptap_json') {
    return { field: 'content', message: 'invalid content' };
  }

  // Not a field the editor exposes — the form picks the format itself, so a
  // bad one is a bug rather than something an admin can correct in an input.
  if (data.contentFormat && !VALID_CONTENT_FORMATS.includes(data.contentFormat)) {
    return { field: null, message: 'invalid content format' };
  }

  const localeError = validateLocale(data.locale);
  if (localeError) return { field: 'locale', message: localeError };

  const statusError = validateStatus(data.status);
  if (statusError) return { field: 'status', message: statusError };

  const publishedError = validatePublishedDate(data.status, data.publishedAt);
  if (publishedError) return { field: 'publishedAt', message: publishedError };

  if (data.icon && data.icon.length > 10) {
    return { field: 'icon', message: 'invalid icon' };
  }

  return null;
}
