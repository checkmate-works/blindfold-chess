import type { ArticleCategory } from '../../_lib/types';

// Common metadata that doesn't depend on language
export const commonMetadata = {
  slug: 'knight-tour',
  category: 'practice' as ArticleCategory,
  difficulty: 'intermediate' as const,
  publishedAt: '2024-12-30',
  order: 3, // Display after fen-notation
};
