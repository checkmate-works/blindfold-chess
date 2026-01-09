import type { ArticleCategory } from '../../_lib/types';

// Common metadata that doesn't depend on language
export const commonMetadata = {
  slug: 'square-colors',
  category: 'coordinates' as ArticleCategory,
  difficulty: 'beginner' as const,
  publishedAt: '2024-01-05',
  order: 2, // Display as second article
};
