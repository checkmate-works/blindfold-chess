const VALID_STATUSES = ['draft', 'published'] as const;

type ArticleData = {
  slug: string;
  title: string;
  content: string;
  locale: string;
  status: string;
  publishedAt: string | null;
  icon: string | null;
};

export function validateArticleData(data: ArticleData): string | null {
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

  if (data.status === 'published' && !data.publishedAt) {
    return 'Published date is required when status is published';
  }

  if (data.icon && data.icon.length > 10) {
    return 'invalid icon';
  }

  return null;
}
