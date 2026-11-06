export type ExpInput = {
  score: number;
  incorrectAnswers: number;
  menuType: string;
};

export type ExpResult = {
  baseExp: number;
  accuracyMultiplier: number;
  totalExp: number;
};

export type LevelProgress = {
  level: number;
  /** Cumulative Exp at which the current level was reached (a threshold, not Exp earned within it). */
  currentLevelExp: number;
  /** Cumulative Exp at which the next level is reached. */
  nextLevelExp: number;
  /** Fraction (0–1, not a percentage) of the way from `currentLevelExp` to `nextLevelExp`. */
  progress: number;
};

/**
 * Exp (experience point) information returned after a challenge result is saved.
 * Shared between server-side save logic and client-side display components.
 */
export type ExpInfo = {
  earnedExp: number;
  totalExp: number;
  level: number;
  levelUp: boolean;
  progressPercent: number;
};
