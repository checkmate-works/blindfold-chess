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
  currentLevelExp: number; // 現レベルの必要累計Exp
  nextLevelExp: number; // 次レベルの必要累計Exp
  progress: number; // 0.0 - 1.0（現レベル内の進捗率）
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
