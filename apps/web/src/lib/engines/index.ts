export type { EngineKind } from './types';
export { DEFAULT_ENGINE, ENGINE_KINDS, isEngineKind } from './types';

export type { StockfishOpponentConfig } from './stockfish';
export { createStockfishOpponent } from './stockfish';

export type { MaiaOpponentConfig } from './maia';
export { createMaiaOpponent, DEFAULT_MAIA_CONFIG, DEFAULT_MAIA_MODEL_URL } from './maia';
