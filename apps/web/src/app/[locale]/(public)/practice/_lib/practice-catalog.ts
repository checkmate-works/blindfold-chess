import type { PracticeMenuType } from '@/lib/db/practice-menu-types';

import type { PracticeLevel } from './practice-levels';

/** One practice module as the practice list shows it. */
export type PracticeCatalogEntry = {
  /** Route segment under `/practice`. */
  readonly id: string;
  /** Keys the emoji, the rank mapping and the card's example band. */
  readonly menuType: PracticeMenuType;
  /** The difficulty band the module is listed under. */
  readonly level: PracticeLevel;
  /** Full message key of the module's title. */
  readonly titleKey: string;
};

/**
 * Every module the practice list offers, in the order it lists them: grouped
 * by band, the bands in `PRACTICE_LEVELS` order.
 *
 * The band is the module's place on the practice list, and it is also what
 * "related practice" means elsewhere — the modules a reader is shown next to
 * one they are about to play are the others in its band, the same set the
 * list's difficulty filter narrows to.
 */
export const PRACTICE_CATALOG: readonly PracticeCatalogEntry[] = [
  {
    id: 'square-colors',
    menuType: 'square_colors',
    level: 'beginner',
    titleKey: 'practice.squareColors.title',
  },
  {
    id: 'coordinate-quiz',
    menuType: 'coordinate_quiz',
    level: 'beginner',
    titleKey: 'practice.coordinateQuiz.title',
  },
  {
    id: 'legal-moves',
    menuType: 'legal_moves',
    level: 'beginner',
    titleKey: 'practice.legalMoves.title',
  },
  {
    id: 'diagonal-quiz',
    menuType: 'diagonal_quiz',
    level: 'intermediate',
    titleKey: 'practice.diagonalQuiz.title',
  },
  {
    id: 'board-symmetry',
    menuType: 'board_symmetry',
    level: 'intermediate',
    titleKey: 'practice.boardSymmetry.title',
  },
  {
    id: 'route-planner',
    menuType: 'route_planner',
    level: 'intermediate',
    titleKey: 'practice.routePlanner.title',
  },
  {
    id: 'position-memory',
    menuType: 'position_memory',
    level: 'advanced',
    titleKey: 'practice.positionMemory.title',
  },
  { id: 'puzzle', menuType: 'puzzle', level: 'advanced', titleKey: 'practice.puzzle.title' },
  {
    id: 'knight-tour',
    menuType: 'knight_tour',
    level: 'expert',
    titleKey: 'practice.knightTour.title',
  },
  { id: 'recall', menuType: 'recall', level: 'expert', titleKey: 'recall.title' },
  {
    id: 'algebraic-notation',
    menuType: 'algebraic_notation',
    level: 'introduction',
    titleKey: 'practice.algebraicNotation.title',
  },
  { id: 'fen', menuType: 'fen', level: 'introduction', titleKey: 'practice.fen.title' },
  {
    id: 'quadrants',
    menuType: 'quadrant_anchors',
    level: 'introduction',
    titleKey: 'practice.quadrantAnchors.title',
  },
];

/**
 * The other modules in the band `id` is listed under, in list order. Empty
 * for an id the catalog does not know.
 */
export function relatedPractices(id: string): PracticeCatalogEntry[] {
  const self = PRACTICE_CATALOG.find((entry) => entry.id === id);
  if (!self) return [];
  return PRACTICE_CATALOG.filter((entry) => entry.level === self.level && entry.id !== id);
}
