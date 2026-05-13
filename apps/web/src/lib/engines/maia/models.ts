import type { MaiaConfig } from '@blindfold-chess/features/ai-game/maia';

/**
 * Path at which the Maia 3 "simplified" ONNX model is served. The file
 * is fetched into `apps/web/public/engines/maia/` by
 * `scripts/download-maia.ts` (run by the `prebuild` hook), so it
 * resolves to a same-origin static asset at runtime.
 */
export const DEFAULT_MAIA_MODEL_URL = '/engines/maia/maia3_simplified.onnx';

/**
 * Sensible mid-range default. Maia 3 takes continuous Elo, so callers
 * should override with the user's actual rating when known — the
 * default is just the value used when nothing more specific is in
 * scope (PoC routes, smoke tests, ...).
 */
export const DEFAULT_MAIA_CONFIG: MaiaConfig = {
  selfElo: 1500,
  opponentElo: 1500,
};
