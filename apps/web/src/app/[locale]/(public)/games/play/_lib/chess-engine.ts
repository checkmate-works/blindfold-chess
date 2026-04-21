// Re-export surface of the chess-engine module, preserved for callers that
// import from `_lib/chess-engine`. The implementation lives in
// `_lib/chess-engine/` and is split between a low-level UCI transport and
// a high-level engine wrapper — see `chess-engine/chess-engine.ts` and
// `chess-engine/uci-transport.ts` for details.
export {
  ChessEngine,
  getChessEngine,
  resetChessEngine,
  type EvaluationResult,
} from './chess-engine/chess-engine';
