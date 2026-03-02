import type { ArticleCategory } from '../../_lib/types';

// Common metadata that doesn't depend on language
export const commonMetadata = {
  slug: 'knight-movement',
  category: 'moves' as ArticleCategory,
  difficulty: 'beginner' as const,
  publishedAt: '2024-01-20',
};
