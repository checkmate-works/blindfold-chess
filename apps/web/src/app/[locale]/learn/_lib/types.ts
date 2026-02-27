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
  notation: {
    icon: '📝',
    className: 'text-warning bg-warning/10',
  },
  coordinates: {
    icon: '🎯',
    className: 'text-info bg-info/10',
  },
  moves: {
    icon: '♟️',
    className: 'text-success bg-success/10',
  },
  memory: {
    icon: '🧠',
    className: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
  },
  practice: {
    icon: '🏋️',
    className: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
  },
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
