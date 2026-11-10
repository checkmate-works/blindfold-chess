export type { AggregatedStats } from "./aggregate-results";
export { aggregateResults } from "./aggregate-results";
export type { PalettePiece } from "./board-edit";
export {
  EMPTY_BOARD_FEN,
  PALETTE_PIECES,
  applyBoardTap,
  setSquarePiece,
} from "./board-edit";
export type { FenPosition, FenProblem, PresetPosition } from "./problems";
export {
  FEN_PROBLEMS,
  PRESET_POSITIONS,
  PRESET_POSITION_COUNT,
  getFenPositions,
  getPositionName,
} from "./problems";
export type {
  FenDetailedStats,
  FenProblemResultEntry,
  FenResultData,
  FenSessionSummary,
} from "./result-data";
export { parseFenResultData, summarizeFenSession } from "./result-data";
export { selectInitialPositions } from "./select-initial-positions";
export type { CustomFenError, FenSettings } from "./settings";
export {
  DEFAULT_FEN_SETTINGS,
  MAX_FEN_COUNT,
  parseCustomFenLines,
  validateCustomFenInput,
} from "./settings";
export type { AccuracyDescriptions } from "./use-piece-accuracy";
export type {
  FenSessionPhase,
  UseFenPracticeSessionConfig,
  UseFenPracticeSessionReturn,
} from "./use-fen-practice-session";
