import type { PracticeModuleId } from '@/app/[locale]/_lib/practice-modules';
import { PRACTICE_MODULES } from '@/app/[locale]/_lib/practice-modules';

export const LOCALES = ['en', 'ja'] as const;
export type Locale = (typeof LOCALES)[number];

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
    className: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  },
  coordinates: {
    icon: '🎯',
    className: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  },
  moves: {
    icon: '♟️',
    className: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
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
  'square-colors': [PRACTICE_MODULES.SQUARE_COLORS],
  'board-symmetry': [PRACTICE_MODULES.BOARD_SYMMETRY],
  'knight-tour': [PRACTICE_MODULES.KNIGHT_TOUR],
  'legal-moves': [PRACTICE_MODULES.LEGAL_MOVES],
  'position-memory': [PRACTICE_MODULES.POSITION_MEMORY],
};
