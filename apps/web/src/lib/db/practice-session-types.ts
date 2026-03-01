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

type PracticeMode = 'timed' | 'training' | 'rush';

type BaseTimedSettings = {
  timeLimit: number;
  mode: PracticeMode;
};

type BaseQuizResult = {
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
  timeTaken: number;
  averageTime: number;
  /** セッション所要時間（ミリ秒）。packages/features の BasePracticeResult には存在しないフィールドで、DB保存時にアプリケーション層で付与する */
  durationMs: number;
};

// ---------------------------------------------------------------------------
// Per-menu Settings types (what gets stored in settings JSONB)
// ---------------------------------------------------------------------------

type BoardOrientation = 'white' | 'black' | 'random';
type FeedbackSpeed = 'fast' | 'normal' | 'slow';

export type CoordinateQuizSettings = BaseTimedSettings & {
  orientation: BoardOrientation;
  feedbackSpeed: FeedbackSpeed;
};

export type LegalMovesSettings = BaseTimedSettings & {
  /** 元の型は PieceType[] だが、JSONB シリアライズのため string[] に緩和 */
  selectedPieces: string[];
};

export type SquareColorsSettings = {
  timeLimit: number;
  mistakeAllowance: number;
};

export type BoardSymmetrySettings = BaseTimedSettings;

export type RoutePlannerSettings = {
  problemCount: number;
  /** 元の型は RoutePlannerPieceType[] だが、JSONB シリアライズのため string[] に緩和 */
  selectedPieces: string[];
};

export type DiagonalQuizSettings = BaseTimedSettings;

export type PositionMemorySettings = {
  timeLimit: number;
  problemCount: number;
  shuffle: boolean;
  source: 'preset' | 'custom';
};

export type KnightTourSettings = {
  startingSquareOption: string;
  blindfoldMode: boolean;
};

export type MoveSequenceSettings = {
  fen: string;
  pgn: string;
  includeOpponentMoves: boolean;
};

export type AlgebraicNotationSettings = Record<string, never>;

export type FenSettings = {
  problemCount: number;
  shuffle: boolean;
  source: 'preset' | 'custom';
};

export type QuadrantAnchorsSettings = {
  problemCount: number;
  orientation: BoardOrientation;
  mode: PracticeMode;
};

// ---------------------------------------------------------------------------
// Per-menu Result types (what gets stored in result JSONB)
// ---------------------------------------------------------------------------

export type CoordinateQuizResult = BaseQuizResult & {
  points: number;
};

export type LegalMovesResult = BaseQuizResult & {
  incorrectAnswers: number;
};

export type SquareColorsResult = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
};

export type BoardSymmetryResult = BaseQuizResult & {
  incorrectAnswers: number;
};

export type RoutePlannerProblemResult = {
  piece: string;
  start: string;
  end: string;
  success: boolean;
  userPath: string[];
  shortestPath: string[];
  skipped?: boolean;
};

export type RoutePlannerResult = {
  problems: RoutePlannerProblemResult[];
  totalProblems: number;
  correctCount: number;
  accuracy: number;
  durationMs: number;
};

export type DiagonalQuizResult = BaseQuizResult & {
  incorrectAnswers: number;
};

export type PositionMemoryProblemResult = {
  fen: string;
  recreatedFen: string;
  isBlackToMove: boolean;
  accuracy: number;
  correctPieces: number;
  totalPieces: number;
  incorrectPieces: number;
  missingPieces: number;
  extraPieces: number;
  skipped: boolean;
};

export type PositionMemoryResult = {
  score: number;
  total: number;
  problemResults: PositionMemoryProblemResult[];
  detailedStats: {
    correctPieces: number;
    totalPieces: number;
    incorrectPieces: number;
    missingPieces: number;
    extraPieces: number;
  };
  durationMs: number;
};

export type KnightTourResult = {
  visitedSquares: [string, number][];
  lastSquare: string;
  success: boolean;
  isClosedTour: boolean;
  moveCount: number;
  durationMs: number;
};

export type MoveSequenceRecallResult = {
  expectedMove: string;
  userMove: string | null;
  isCorrect: boolean;
  attempts: number;
  wrongAttempts: string[];
};

export type MoveSequenceResult = {
  totalMoves: number;
  correctMoves: number;
  accuracy: number;
  results: MoveSequenceRecallResult[];
  durationMs: number;
};

export type AlgebraicNotationResult = {
  score: number;
  total: number;
  durationMs: number;
};

export type FenProblemResult = {
  fen: string;
  recreatedFen: string;
  isBlackToMove: boolean;
  accuracy: number;
  correctPieces: number;
  totalPieces: number;
  incorrectPieces: number;
  missingPieces: number;
  extraPieces: number;
  skipped: boolean;
};

export type FenResult = {
  score: number;
  total: number;
  results: FenProblemResult[];
  detailedStats: {
    correctPieces: number;
    totalPieces: number;
    incorrectPieces: number;
    missingPieces: number;
    extraPieces: number;
  } | null;
  durationMs: number;
};

export type QuadrantAnchorsResult = {
  score: number;
  total: number;
  durationMs: number;
};

// ---------------------------------------------------------------------------
// Type map: menu_type -> { settings, result }
// ---------------------------------------------------------------------------

export type PracticeSessionTypeMap = {
  coordinate_quiz: { settings: CoordinateQuizSettings; result: CoordinateQuizResult };
  legal_moves: { settings: LegalMovesSettings; result: LegalMovesResult };
  square_colors: { settings: SquareColorsSettings; result: SquareColorsResult };
  board_symmetry: { settings: BoardSymmetrySettings; result: BoardSymmetryResult };
  route_planner: { settings: RoutePlannerSettings; result: RoutePlannerResult };
  diagonal_quiz: { settings: DiagonalQuizSettings; result: DiagonalQuizResult };
  position_memory: { settings: PositionMemorySettings; result: PositionMemoryResult };
  knight_tour: { settings: KnightTourSettings; result: KnightTourResult };
  move_sequence: { settings: MoveSequenceSettings; result: MoveSequenceResult };
  algebraic_notation: { settings: AlgebraicNotationSettings; result: AlgebraicNotationResult };
  fen: { settings: FenSettings; result: FenResult };
  quadrant_anchors: { settings: QuadrantAnchorsSettings; result: QuadrantAnchorsResult };
};

// ---------------------------------------------------------------------------
// Type-safe insert helper
// ---------------------------------------------------------------------------

export type TypedNewPracticeSession<T extends PracticeMenuType> = {
  userId: string;
  menuType: T;
  settings: PracticeSessionTypeMap[T]['settings'];
  result: PracticeSessionTypeMap[T]['result'];
  startedAt?: Date;
};
