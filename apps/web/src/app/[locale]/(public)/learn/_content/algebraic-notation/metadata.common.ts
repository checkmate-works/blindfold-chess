import type { ArticleCategory } from '../../_lib/types';

// Common metadata that doesn't depend on language
export const commonMetadata = {
  slug: 'algebraic-notation',
  category: 'notation' as ArticleCategory,
  difficulty: 'beginner' as const,
  publishedAt: '2024-01-30',
  order: 1, // Display as first article
};
