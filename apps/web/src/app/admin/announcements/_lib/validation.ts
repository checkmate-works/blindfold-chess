const VALID_STATUSES = ['draft', 'published'] as const;
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
  if (!data.slug || data.slug.length > 255) {
    return 'invalid slug';
  }

  if (!data.title || data.title.length > 255) {
    return 'invalid title';
  }

  if (!data.content) {
    return 'invalid content';
  }

  if (!data.locale || data.locale.length > 10) {
    return 'invalid locale';
  }

  if (!VALID_STATUSES.includes(data.status as (typeof VALID_STATUSES)[number])) {
    return 'invalid status';
  }

  if (!VALID_VISIBILITIES.includes(data.visibility as (typeof VALID_VISIBILITIES)[number])) {
    return 'invalid visibility';
  }

  if (data.status === 'published' && !data.publishedAt) {
    return 'Published date is required when status is published';
  }

  return null;
}
