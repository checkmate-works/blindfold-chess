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

export function validateAnnouncementData(data: AnnouncementData): string | null {
  const slugError = validateSlug(data.slug);
  if (slugError) return slugError;

  const titleError = validateTitle(data.title);
  if (titleError) return titleError;

  if (!data.content) {
    return 'invalid content';
  }

  const localeError = validateLocale(data.locale);
  if (localeError) return localeError;

  const statusError = validateStatus(data.status);
  if (statusError) return statusError;

  if (!VALID_VISIBILITIES.includes(data.visibility as (typeof VALID_VISIBILITIES)[number])) {
    return 'invalid visibility';
  }

  const publishedError = validatePublishedDate(data.status, data.publishedAt);
  if (publishedError) return publishedError;

  return null;
}
