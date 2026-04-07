// モジュールごとのExp重み
export const MODULE_WEIGHT: Record<string, number> = {
  coordinate_quiz: 10,
  square_colors: 10,
  diagonal_quiz: 12,
  legal_moves: 15,
  board_symmetry: 15,
  route_planner: 20,
};

// デフォルト重み（未知のmenuTypeに適用）
export const DEFAULT_MODULE_WEIGHT = 10;

// 精度ボーナス閾値（min降順で判定）
export const ACCURACY_THRESHOLDS = [
  { min: 1.0, multiplier: 1.5 }, // パーフェクト
  { min: 0.9, multiplier: 1.2 },
  { min: 0.8, multiplier: 1.1 },
] as const;

// ストリーク（同日チャレンジ連続回数）ボーナス
export const STREAK_THRESHOLDS = [
  { min: 5, multiplier: 1.3 },
  { min: 3, multiplier: 1.2 },
  { min: 2, multiplier: 1.1 },
] as const;

// レベルカーブ: requiredExp(level) = floor(BASE * level^EXPONENT)
export const EXP_CURVE = { base: 100, exponent: 1.5 } as const;

// チャレンジ完了の最低保証Exp
export const MIN_COMPLETION_EXP = 1;
