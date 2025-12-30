/**
 * Types and constants for learn section articles
 */
import type { PracticeModuleId } from '@/app/[locale]/_lib/practice-modules';

export type ArticleMetadata = {
  title: string;
  slug: string;
  tags: readonly string[];
  publishedAt: string;
  excerpt: string;
  order?: number;
};

export type Article = {
  metadata: ArticleMetadata;
  content: string;
};

export const ARTICLE_SLUGS = {
  ALGEBRAIC_NOTATION: 'algebraic-notation',
  BISHOP_MOVEMENT: 'bishop-movement',
  FEN_NOTATION: 'fen-notation',
  KING_MOVEMENT: 'king-movement',
  KNIGHT_MOVEMENT: 'knight-movement',
  KNIGHT_TOUR: 'knight-tour',
  POSITION_MEMORY: 'position-memory',
  ROOK_MOVEMENT: 'rook-movement',
  SQUARE_COLORS: 'square-colors',
} as const;

export type ArticleSlug = (typeof ARTICLE_SLUGS)[keyof typeof ARTICLE_SLUGS];

export const ARTICLE_ICONS: Record<ArticleSlug, string> = {
  [ARTICLE_SLUGS.ALGEBRAIC_NOTATION]: '🔤',
  [ARTICLE_SLUGS.BISHOP_MOVEMENT]: '♗',
  [ARTICLE_SLUGS.FEN_NOTATION]: '📝',
  [ARTICLE_SLUGS.KING_MOVEMENT]: '♔',
  [ARTICLE_SLUGS.KNIGHT_MOVEMENT]: '♘',
  [ARTICLE_SLUGS.KNIGHT_TOUR]: '♞',
  [ARTICLE_SLUGS.POSITION_MEMORY]: '🧠',
  [ARTICLE_SLUGS.ROOK_MOVEMENT]: '♜',
  [ARTICLE_SLUGS.SQUARE_COLORS]: '🏁',
} as const;

/**
 * Mapping between learn articles and related practice modules
 *
 * This is a business logic configuration, not a type dependency.
 * Both ArticleSlug and PracticeModuleId are independent types.
 */
export const ARTICLE_PRACTICE_MAPPING: Partial<Record<ArticleSlug, PracticeModuleId[]>> = {
  'algebraic-notation': ['algebraic-notation', 'coordinate-quiz'],
  'bishop-movement': ['legal-moves'],
  'fen-notation': ['fen', 'position-memory'],
  'king-movement': ['legal-moves'],
  'knight-movement': ['legal-moves'],
  'knight-tour': ['knight-tour'],
  'rook-movement': ['legal-moves'],
  'square-colors': ['square-colors'],
  'position-memory': ['position-memory'],
};
