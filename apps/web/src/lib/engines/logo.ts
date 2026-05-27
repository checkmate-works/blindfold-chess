import type { EngineKind } from './types';

/**
 * Public-path PNG logo for each engine, used wherever an engine needs a
 * visual identity (the `games/new` engine picker and the dense game-list
 * rows). Centralised here so a logo swap is a single-line change rather
 * than a grep across components.
 */
export const ENGINE_LOGO_SRC: Record<EngineKind, string> = {
  stockfish: '/images/engines/stockfish.png',
  maia: '/images/engines/maia.png',
};
