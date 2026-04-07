export type ExpInput = {
  score: number;
  totalQuestions: number;
  menuType: string;
  dailyChallengeCount: number; // 当日の完了済みチャレンジ数（このチャレンジを含まない）
};

export type ExpResult = {
  baseExp: number;
  accuracyMultiplier: number;
  streakMultiplier: number;
  totalExp: number;
};

export type LevelProgress = {
  level: number;
  currentLevelExp: number; // 現レベルの必要累計Exp
  nextLevelExp: number; // 次レベルの必要累計Exp
  progress: number; // 0.0 - 1.0（現レベル内の進捗率）
};
