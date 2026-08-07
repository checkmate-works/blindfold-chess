export {
  FILES,
  RANKS,
  DISPLAY_RANKS,
  BOARD_SIZE,
  TOTAL_SQUARES,
  BOARD_LAST_INDEX,
} from "./constants";
export type {
  BasePracticeResult,
  BasePracticeSettings,
  PracticeResultWithMistakes,
  PracticeMode,
} from "./types";
export { DEFAULT_BASE_PRACTICE_SETTINGS } from "./types";
export {
  type CountdownState,
  COUNTDOWN_STEP_DURATION,
  COUNTDOWN_START_DISPLAY_DURATION,
  COUNTDOWN_INITIAL_VALUE,
  getNextCountdownValue,
  isCountdownActive,
} from "./countdown";
export {
  computePracticeResult,
  deriveResultStats,
  type StatItem,
  type DerivedResultStats,
  type DeriveResultStatsLabels,
} from "./practice-result";
export {
  type RandomSource,
  ALL_SQUARES,
  squareToFileIndex,
  squareToRankIndex,
  fileRankToSquare,
  isLightSquare,
  isValidSquare,
  computeSquareColor,
  formatTime,
  resolveOrientation,
  generateRandomSquare,
  generateSquareSequence,
  shuffleArray,
} from "./utils";
export type { DisplayPieceType } from "./piece-glyphs";
export { PIECE_DISPLAY_MAP } from "./piece-glyphs";
export {
  KNIGHT_OFFSETS,
  BISHOP_DIRS,
  ROOK_DIRS,
  QUEEN_DIRS,
  KING_OFFSETS,
} from "./piece-moves";
export type { MirrorAxis } from "./geometry";
export { mirrorSquare, flipForOrientation } from "./geometry";
export type { MobilityPiece } from "./piece-mobility";
export { getMovesForPiece } from "./piece-mobility";
export type {
  CoordinateBackspaceResult,
  StagedCoordinateSelection,
} from "./coordinate-backspace";
export { applyCoordinateBackspace } from "./coordinate-backspace";
export type {
  PositionAccuracy,
  ScoreDetail,
  SquareDiff,
  SquareStatus,
} from "./accuracy";
export { calculateAccuracy, calculateSquareDifferences } from "./accuracy";
export type { FeedbackSpeed } from "./feedback-speed";
export { FEEDBACK_SPEEDS, FEEDBACK_SPEED_MS } from "./feedback-speed";
export { FEEDBACK_FLASH_MS, flashFeedbackDuration } from "./flash-policy";
export { toggleSelection } from "./toggle-selection";
export type { PersistentStorage } from "./persistent-storage";
export type {
  UsePersistentSettingsOptions,
  UsePersistentSettingsReturn,
} from "./use-persistent-settings";
