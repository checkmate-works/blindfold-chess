import type { AdminValidationIssue } from '@/app/admin/_lib/action-factories';
import {
  validateLocale,
  validatePublishedDate,
  validateSlug,
  validateStatus,
  validateTitle,
} from '@/app/admin/_lib/validators';

const VALID_VISIBILITIES = ['public', 'members_only'] as const;

type AnnouncementData = {
  slug: string;
  title: string;
  content: string;
  locale: string;
  status: string;
  visibility: string;
  publishedAt: string | null;
};

/**
 * @returns An {@link AdminValidationIssue} naming the offending field, or
 *   `null` when the data is valid. See `validateArticleData` for why the
 *   field is carried rather than dropped.
 */
export function validateAnnouncementData(data: AnnouncementData): AdminValidationIssue | null {
  const slugError = validateSlug(data.slug);
  if (slugError) return { field: 'slug', message: slugError };

  const titleError = validateTitle(data.title);
  if (titleError) return { field: 'title', message: titleError };

  if (!data.content) {
    return { field: 'content', message: 'invalid content' };
  }

  const localeError = validateLocale(data.locale);
  if (localeError) return { field: 'locale', message: localeError };

  const statusError = validateStatus(data.status);
  if (statusError) return { field: 'status', message: statusError };

  if (!VALID_VISIBILITIES.includes(data.visibility as (typeof VALID_VISIBILITIES)[number])) {
    return { field: 'visibility', message: 'invalid visibility' };
  }

  const publishedError = validatePublishedDate(data.status, data.publishedAt);
  if (publishedError) return { field: 'publishedAt', message: publishedError };

  return null;
}
