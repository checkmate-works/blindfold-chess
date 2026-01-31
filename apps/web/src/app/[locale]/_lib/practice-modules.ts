/**
 * Practice module constants and mappings
 *
 * Shared across learn and practice sections for consistent module identification,
 * translation keys, and visual representation.
 */

// Practice module identifiers (kebab-case for URLs)
export const PRACTICE_MODULES = {
  ALGEBRAIC_NOTATION: 'algebraic-notation',
  COORDINATE_QUIZ: 'coordinate-quiz',
  FEN: 'fen',
  KNIGHT_TOUR: 'knight-tour',
  LEGAL_MOVES: 'legal-moves',
  POSITION_MEMORY: 'position-memory',
  SQUARE_COLORS: 'square-colors',
  BOARD_SYMMETRY: 'board-symmetry',
} as const;

export type PracticeModuleId = (typeof PRACTICE_MODULES)[keyof typeof PRACTICE_MODULES];

// Translation key mapping (camelCase for i18n keys)
export const PRACTICE_MODULE_TRANSLATION_KEYS: Record<PracticeModuleId, string> = {
  [PRACTICE_MODULES.ALGEBRAIC_NOTATION]: 'algebraicNotation',
  [PRACTICE_MODULES.COORDINATE_QUIZ]: 'coordinateQuiz',
  [PRACTICE_MODULES.FEN]: 'fen',
  [PRACTICE_MODULES.KNIGHT_TOUR]: 'knightTour',
  [PRACTICE_MODULES.LEGAL_MOVES]: 'legalMoves',
  [PRACTICE_MODULES.POSITION_MEMORY]: 'positionMemory',
  [PRACTICE_MODULES.SQUARE_COLORS]: 'squareColors',
  [PRACTICE_MODULES.BOARD_SYMMETRY]: 'boardSymmetry',
} as const;

// Icon mapping for visual representation
export const PRACTICE_MODULE_ICONS: Record<PracticeModuleId, string> = {
  [PRACTICE_MODULES.ALGEBRAIC_NOTATION]: '🔤',
  [PRACTICE_MODULES.COORDINATE_QUIZ]: '🎯',
  [PRACTICE_MODULES.FEN]: '📝',
  [PRACTICE_MODULES.KNIGHT_TOUR]: '♞',
  [PRACTICE_MODULES.LEGAL_MOVES]: '♗',
  [PRACTICE_MODULES.POSITION_MEMORY]: '🧠',
  [PRACTICE_MODULES.SQUARE_COLORS]: '🏁',
  [PRACTICE_MODULES.BOARD_SYMMETRY]: '🦋',
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
 * Get icon for a practice module
 * @param moduleId - The practice module identifier
 * @returns Emoji icon string
 */
export function getPracticeModuleIcon(moduleId: PracticeModuleId): string {
  return PRACTICE_MODULE_ICONS[moduleId];
}
