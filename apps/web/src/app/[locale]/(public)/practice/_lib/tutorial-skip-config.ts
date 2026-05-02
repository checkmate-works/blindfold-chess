/**
 * Centralized configuration for per-module "skip tutorial" behavior.
 *
 * Each entry defines:
 * - storageKey: localStorage key marking the tutorial as skipped/finished. Existing
 *   keys are preserved verbatim so user state across upgrades is not invalidated.
 * - redirectPath: route segment under `/{locale}/practice/`. Used when the user
 *   skips the tutorial (jump back to the module's setup page) and when an unskipped
 *   user lands on the setup page (redirect into the tutorial).
 * - translationNamespace / translationKey: i18n keys for the skip button label.
 */
export type TutorialSkipModuleId =
  | 'boardSymmetry'
  | 'diagonalQuiz'
  | 'routePlanner'
  | 'knightTour'
  | 'fen'
  | 'positionMemory';

export type TutorialSkipModuleConfig = {
  storageKey: string;
  redirectPath: string;
  translationNamespace: string;
  translationKey?: string;
};

export const TUTORIAL_SKIP_CONFIG: Record<TutorialSkipModuleId, TutorialSkipModuleConfig> = {
  boardSymmetry: {
    storageKey: 'boardSymmetryTutorialSkipped',
    redirectPath: 'board-symmetry',
    translationNamespace: 'practice.boardSymmetry',
  },
  diagonalQuiz: {
    storageKey: 'diagonalQuizTutorialSkipped',
    redirectPath: 'diagonal-quiz',
    translationNamespace: 'practice.diagonalQuiz.tutorial',
    translationKey: 'skip',
  },
  routePlanner: {
    storageKey: 'routePlannerTutorialSkipped',
    redirectPath: 'route-planner',
    translationNamespace: 'practice.routePlanner.tutorial',
    translationKey: 'skip',
  },
  knightTour: {
    storageKey: 'knightTourTutorialSkipped',
    redirectPath: 'knight-tour',
    translationNamespace: 'practice.knightTour.tutorial',
    translationKey: 'skip',
  },
  fen: {
    storageKey: 'fenTutorialSkipped',
    redirectPath: 'fen',
    translationNamespace: 'practice.fen',
  },
  positionMemory: {
    storageKey: 'positionMemoryTutorialSkipped',
    redirectPath: 'position-memory',
    translationNamespace: 'practice.positionMemory',
  },
};
