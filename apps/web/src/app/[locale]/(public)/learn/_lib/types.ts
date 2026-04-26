import type { PracticeModuleId } from '@/app/[locale]/_lib/practice-modules';
import { PRACTICE_MODULES } from '@/app/[locale]/_lib/practice-modules';
import type { Locale } from '@/app/[locale]/_lib/types';

export type { Locale };

export const ARTICLE_CATEGORIES = {
  NOTATION: 'notation',
  COORDINATES: 'coordinates',
  MOVES: 'moves',
  MEMORY: 'memory',
  PRACTICE: 'practice',
} as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[keyof typeof ARTICLE_CATEGORIES];

export const CATEGORY_STYLES = {
  notation: { icon: '📝' },
  coordinates: { icon: '🎯' },
  moves: { icon: '♟️' },
  memory: { icon: '🧠' },
  practice: { icon: '🏋️' },
} as const;

export type ArticleSlug =
  | 'algebraic-notation'
  | 'anchor-squares'
  | 'bishop-movement'
  | 'board-symmetry'
  | 'coordinate-confusion'
  | 'de-groot-experiment'
  | 'diagonals'
  | 'fen-notation'
  | 'king-movement'
  | 'knight-movement'
  | 'knight-tour'
  | 'position-memory'
  | 'quadrant-anchors'
  | 'rook-movement'
  | 'square-colors';

export type ArticleDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type ArticleMetadata = {
  slug: string;
  title: string;
  excerpt: string;
  description?: string;
  publishedAt: string;
  category: ArticleCategory;
  difficulty: ArticleDifficulty;
  tags: readonly string[];
  order?: number;
  recommendedPractice?: PracticeModuleId[];
};

export type Article = {
  metadata: ArticleMetadata;
  content: string;
};

export const ARTICLE_ICONS: Record<ArticleSlug, string> = {
  'algebraic-notation': '🔤',
  'anchor-squares': '⚓',
  'bishop-movement': '♝',
  'board-symmetry': '🦋',
  'coordinate-confusion': '🤔',
  'de-groot-experiment': '🔬',
  diagonals: '↗️',
  'fen-notation': '📝',
  'king-movement': '♔',
  'knight-movement': '♞',
  'knight-tour': '🔄',
  'position-memory': '🧠',
  'quadrant-anchors': '☗',
  'rook-movement': '♜',
  'square-colors': '🏁',
};

export const ARTICLE_PRACTICE_MAPPING: Record<string, PracticeModuleId[]> = {
  'algebraic-notation': [PRACTICE_MODULES.ALGEBRAIC_NOTATION],
  'coordinate-quiz': [PRACTICE_MODULES.COORDINATE_QUIZ],
  diagonals: [PRACTICE_MODULES.DIAGONAL_QUIZ],
  'square-colors': [PRACTICE_MODULES.SQUARE_COLORS],
  'board-symmetry': [PRACTICE_MODULES.BOARD_SYMMETRY],
  'knight-tour': [PRACTICE_MODULES.KNIGHT_TOUR],
  'legal-moves': [PRACTICE_MODULES.LEGAL_MOVES],
  'position-memory': [PRACTICE_MODULES.POSITION_MEMORY],
};
