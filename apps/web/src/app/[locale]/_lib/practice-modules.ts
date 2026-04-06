/**
 * Practice module constants and mappings
 *
 * Shared across learn and practice sections for consistent module identification,
 * translation keys, and visual representation.
 *
 * ## Adding a new practice module
 *
 * ### 1. Register the module (this file: `_lib/practice-modules.ts`)
 *    - Add identifier to `PRACTICE_MODULES` (UPPER_SNAKE for key, kebab-case for value)
 *    - Add translation key to `PRACTICE_MODULE_TRANSLATION_KEYS` (camelCase)
 *    - Add icon to `PRACTICE_EMOJIS` in `practice/_lib/practice-emojis.ts`
 *
 * ### 2. Create route directory (`practice/<module-slug>/`)
 *    Typical structure (see `coordinate-quiz/` as reference):
 *    ```
 *    practice/<module-slug>/
 *      page.tsx              — Setup page (Server Component with generateMetadata)
 *      _components/          — Module-specific client components
 *      _lib/                 — Module-specific types & utilities
 *      training/page.tsx     — Free-play training mode (optional)
 *      challenge/page.tsx    — Timed challenge mode (optional)
 *      result/page.tsx       — Result display page (optional)
 *    ```
 *
 * ### 3. Use shared infrastructure (`practice/_components/`, `practice/_hooks/`)
 *
 *    **Layout wrappers** — provide consistent page structure (title, breadcrumb, divider):
 *    - `PracticeSessionPage` — Server Component wrapper for session pages (training/challenge)
 *    - `PracticeResultPage`  — Client Component wrapper for result pages
 *
 *    **Result display** — choose based on module type:
 *    - `PracticeResult`   — Simple score card (correct/total, accuracy, time, average time).
 *                           Best for quiz-style modules (coordinate-quiz, square-colors).
 *    - `PracticeComplete` — Rich result view with optional detailed breakdown,
 *                           per-problem expandable results, segmented progress bar,
 *                           related learning links, and custom children slot.
 *                           Best for position-based modules (position-memory).
 *
 *    **Session UI components:**
 *    - `QuitConfirmModal`      — Modal dialog for confirming session exit
 *    - `SegmentedProgressBar`  — Multi-color progress bar for detailed breakdowns
 *    - `ScoreCounter`          — Live correct/incorrect counter during a session
 *    - `TimeDisplay`           — Formatted time remaining/elapsed display
 *    - `ProgressBar`           — Simple progress bar for problem-count-based sessions
 *    - `SegmentedControl`      — Button group selector for training/challenge mode selection
 *    - `ProblemCountSlider`    — Slider for selecting number of problems in setup
 *    - `TimeSlider`            — Slider for selecting time limit in setup
 *    - `AnswerFeedback`        — Correct/incorrect flash feedback overlay
 *    - `BoardOrientationSelector` — White/Black perspective toggle
 *
 *    **Hooks** (`practice/_hooks/`):
 *    - `useTimedSession<TQuestion>` — Full timed session lifecycle: countdown,
 *        question generation, answer handling with feedback delay, pause/resume,
 *        time-limit auto-finish. Returns `currentQuestion`, `handleAnswer`,
 *        `isFinished`, score counts, etc. Composes `useCountdown` + `useGameTimer`.
 *    - `useCountdown`           — 3-2-1-Go countdown before session starts
 *    - `useGameTimer`           — Precise elapsed time tracking with pause support
 *    - `usePersistentSettings<T>` — localStorage-backed settings (e.g. time limit,
 *        problem count) that persist across sessions
 *
 *    **Shared utilities** (`practice/_lib/`):
 *    - `GameState` type          — `'setup' | 'playing' | 'finished'`
 *    - `calculateAccuracy()`     — Position comparison for board-recreation modules
 *    - `validateFEN()`           — FEN string format validation
 *
 * ### 4. Add to practice index (`practice/page.tsx`)
 *    - Add a `ChallengeCard` entry in the appropriate difficulty section
 *
 * ### 5. Add i18n messages (`src/messages/en.json` + `src/messages/ja.json`)
 *    - Add `practice.<translationKey>.title` and `practice.<translationKey>.description`
 *    - Add all UI strings used by shared components (labels objects for
 *      `PracticeResult` / `PracticeComplete` / `QuitConfirmModal`)
 *
 * ### 6. Learn integration (if a related article exists)
 *    - `learn/_lib/types.ts` — Add entry to `ARTICLE_PRACTICE_MAPPING`
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
