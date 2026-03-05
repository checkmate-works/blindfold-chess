/**
 * practice_sessions テーブルに保存するデータの型定義。
 *
 * これらの型は DB レコードの形状を表しており、packages/features の
 * インメモリ型（BasePracticeResult 等）とは意図的に異なる場合があります。
 *
 * 主な差異:
 * - durationMs: セッション所要時間。アプリケーション層で計算して付与する
 * - string[] / string: JSONB シリアライズの都合上、branded type や
 *   リテラル型（PieceType, AlgebraicNotation 等）は string に緩和している
 */

// ---------------------------------------------------------------------------
// Practice Menu Type (discriminator)
// ---------------------------------------------------------------------------

export const PRACTICE_MENU_TYPES = [
  'coordinate_quiz',
  'legal_moves',
  'square_colors',
  'board_symmetry',
  'route_planner',
  'diagonal_quiz',
  'position_memory',
  'knight_tour',
  'move_sequence',
  'algebraic_notation',
  'fen',
  'quadrant_anchors',
] as const;

export type PracticeMenuType = (typeof PRACTICE_MENU_TYPES)[number];

// ---------------------------------------------------------------------------
// Shared base shapes (mirroring packages/features/src/common/types.ts)
// ---------------------------------------------------------------------------

export type SquareColorsSettings = {
  timeLimit: number;
  mistakeAllowance: number | null;
};

export type SquareColorsResult = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
};
