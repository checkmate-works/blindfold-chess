import type { ArticleCategory } from '../../_lib/types';

// Common metadata that doesn't depend on language
export const commonMetadata = {
  slug: 'fen-notation',
  category: 'notation' as ArticleCategory,
  difficulty: 'beginner' as const,
  publishedAt: '2024-12-30',
  order: 2, // Display after algebraic-notation
};
