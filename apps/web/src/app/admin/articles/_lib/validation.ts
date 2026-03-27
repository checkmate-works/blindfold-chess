import type { ContentFormat } from './types';

const VALID_STATUSES = ['draft', 'published'] as const;
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

export function validateArticleData(data: ArticleData): string | null {
  if (!data.slug || data.slug.length > 255) {
    return 'invalid slug';
  }

  if (!data.title || data.title.length > 255) {
    return 'invalid title';
  }

  if (!data.content && data.contentFormat !== 'tiptap_json') {
    return 'invalid content';
  }

  if (data.contentFormat && !VALID_CONTENT_FORMATS.includes(data.contentFormat)) {
    return 'invalid content format';
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
