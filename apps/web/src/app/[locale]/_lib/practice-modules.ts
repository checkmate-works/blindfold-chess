/**
 * Learn / nav-side practice module identifiers.
 *
 * `PRACTICE_MODULES` is the UPPER_SNAKE access pattern the learn pages and
 * navigation use (`PRACTICE_MODULES.COORDINATE_QUIZ`), mapped to i18n keys and
 * emojis. It is deliberately NOT derived from `PRACTICE_MODULE_REGISTRY` in
 * `src/lib/practice/registry.ts` and lists fewer modules (only those the learn
 * section links to). The registry is the single source of truth for a
 * module's identity, challenge flag and leaderboard wiring, and its TSDoc is
 * the complete checklist for adding a module; add an entry here only when the
 * learn section or the nav needs to name the module.
 */
import { PRACTICE_EMOJIS } from '@/app/[locale]/(public)/practice/_lib/practice-emojis';

// Practice module identifiers (kebab-case for URLs)
export const PRACTICE_MODULES = {
  ALGEBRAIC_NOTATION: 'algebraic-notation',
  COORDINATE_QUIZ: 'coordinate-quiz',
  DIAGONAL_QUIZ: 'diagonal-quiz',
  FEN: 'fen',
  KNIGHT_TOUR: 'knight-tour',
  LEGAL_MOVES: 'legal-moves',
  POSITION_MEMORY: 'position-memory',
  SQUARE_COLORS: 'square-colors',
  BOARD_SYMMETRY: 'board-symmetry',
} as const;

export type PracticeModuleId = (typeof PRACTICE_MODULES)[keyof typeof PRACTICE_MODULES];

// Translation key mapping (camelCase for i18n keys)
const PRACTICE_MODULE_TRANSLATION_KEYS: Record<PracticeModuleId, string> = {
  [PRACTICE_MODULES.ALGEBRAIC_NOTATION]: 'algebraicNotation',
  [PRACTICE_MODULES.COORDINATE_QUIZ]: 'coordinateQuiz',
  [PRACTICE_MODULES.DIAGONAL_QUIZ]: 'diagonalQuiz',
  [PRACTICE_MODULES.FEN]: 'fen',
  [PRACTICE_MODULES.KNIGHT_TOUR]: 'knightTour',
  [PRACTICE_MODULES.LEGAL_MOVES]: 'legalMoves',
  [PRACTICE_MODULES.POSITION_MEMORY]: 'positionMemory',
  [PRACTICE_MODULES.SQUARE_COLORS]: 'squareColors',
  [PRACTICE_MODULES.BOARD_SYMMETRY]: 'boardSymmetry',
} as const;

/**
 * Get translation key for a practice module
 * @param moduleId - The practice module identifier
 * @returns Translation key in camelCase format
 */
export function getPracticeModuleTranslationKey(moduleId: PracticeModuleId): string {
  return PRACTICE_MODULE_TRANSLATION_KEYS[moduleId];
}

/**
 * Get icon for a practice module.
 *
 * Delegates to PRACTICE_EMOJIS (the single source of truth for practice
 * module emojis) by converting the kebab-case module ID to snake_case.
 *
 * @param moduleId - The practice module identifier (kebab-case)
 * @returns Emoji icon string
 */
export function getPracticeModuleIcon(moduleId: PracticeModuleId): string {
  // PRACTICE_EMOJIS uses snake_case keys; PracticeModuleId uses kebab-case
  const snakeKey = moduleId.replace(/-/g, '_');
  return PRACTICE_EMOJIS[snakeKey as keyof typeof PRACTICE_EMOJIS] ?? '';
}
