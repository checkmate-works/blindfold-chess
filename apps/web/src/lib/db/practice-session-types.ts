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

export type CoordinateQuizSettings = {
  timeLimit: number;
  boardOrientation: string;
  mistakeAllowance: number | null;
};

export type CoordinateQuizResult = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
};

export type LegalMovesSettings = {
  timeLimit: number;
  selectedPieces: string[];
  mistakeAllowance: number | null;
};

export type LegalMovesResult = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
};

// ---------------------------------------------------------------------------
// Discriminated Union for typed practice sessions
// ---------------------------------------------------------------------------

type PracticeSessionBase = {
  id: string;
  startedAt: Date | null;
};

export type TypedPracticeSession =
  | (PracticeSessionBase & {
      menuType: 'coordinate_quiz';
      settings: CoordinateQuizSettings;
      result: CoordinateQuizResult;
    })
  | (PracticeSessionBase & {
      menuType: 'legal_moves';
      settings: LegalMovesSettings;
      result: LegalMovesResult;
    })
  | (PracticeSessionBase & {
      menuType: 'square_colors';
      settings: SquareColorsSettings;
      result: SquareColorsResult;
    });

type UnknownPracticeSession = PracticeSessionBase & {
  menuType: string;
  settings: Record<string, unknown>;
  result: Record<string, unknown>;
};

export type PracticeSessionRow = TypedPracticeSession | UnknownPracticeSession;

export type SessionScoreFields = {
  correctAnswers: number;
  incorrectAnswers: number;
  mistakeAllowance: number | null;
};

export function isTypedSession(session: PracticeSessionRow): session is TypedPracticeSession {
  return (
    session.menuType === 'coordinate_quiz' ||
    session.menuType === 'legal_moves' ||
    session.menuType === 'square_colors'
  );
}

export function getSessionScoreFields(session: PracticeSessionRow): SessionScoreFields | null {
  if (isTypedSession(session)) {
    return {
      correctAnswers: session.result.correctAnswers,
      incorrectAnswers: session.result.incorrectAnswers,
      mistakeAllowance: session.settings.mistakeAllowance,
    };
  }
  // Fallback for unknown menu types: runtime check
  const result = session.result;
  const settings = session.settings;
  if (typeof result.correctAnswers !== 'number' || typeof result.incorrectAnswers !== 'number') {
    return null;
  }
  return {
    correctAnswers: result.correctAnswers,
    incorrectAnswers: result.incorrectAnswers,
    mistakeAllowance:
      typeof settings.mistakeAllowance === 'number' ? settings.mistakeAllowance : null,
  };
}

const TYPED_MENU_TYPES = new Set<string>(['coordinate_quiz', 'legal_moves', 'square_colors']);

export function parsePracticeSession(row: {
  id: string;
  menuType: string;
  startedAt: Date | null;
  settings: unknown;
  result: unknown;
}): PracticeSessionRow {
  const base = { id: row.id, startedAt: row.startedAt };

  if (TYPED_MENU_TYPES.has(row.menuType)) {
    return {
      ...base,
      menuType: row.menuType as TypedPracticeSession['menuType'],
      settings: row.settings as TypedPracticeSession['settings'],
      result: row.result as TypedPracticeSession['result'],
    } as TypedPracticeSession;
  }

  return {
    ...base,
    menuType: row.menuType,
    settings: (row.settings ?? {}) as Record<string, unknown>,
    result: (row.result ?? {}) as Record<string, unknown>,
  };
}
