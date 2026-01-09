import type { ArticleCategory } from '../../_lib/types';

// Common metadata that doesn't depend on language
export const commonMetadata = {
  slug: 'bishop-movement',
  category: 'piece-movement' as ArticleCategory,
  difficulty: 'beginner' as const,
  publishedAt: '2024-01-15',
};
