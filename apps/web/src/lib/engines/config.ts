import {
  DEFAULT_ENGINE,
  DEFAULT_ENGINE_CONFIG,
  type EngineConfig,
  type EngineKind,
  isValidSkillLevel,
} from '@blindfold-chess/features/ai-game';
import { DEFAULT_MAIA_RATING, isMaiaRating } from '@blindfold-chess/features/ai-game/maia';

/**
 * The engine + difficulty union, its default and its persisted-record guard
 * live in `@blindfold-chess/features/ai-game`, where the union is documented,
 * so saved games read the same on web and mobile. Re-exported here so web
 * imports stay put; the URL-param codec below is a web share-link concern and
 * stays in this module.
 */
export {
  DEFAULT_ENGINE_CONFIG,
  type EngineConfig,
  isEngineConfig,
} from '@blindfold-chess/features/ai-game';

/**
 * Serialise an {@link EngineConfig} into a flat URL-params bag. Stockfish
 * stays at `?skillLevel=N` for backward-compatible share-links; Maia
 * emits `?engine=maia&elo=N` so the discriminator and difficulty travel
 * together. The Stockfish default never writes `engine=stockfish` for
 * the same backward-compat reason.
 */
export function engineConfigToUrlParams(config: EngineConfig): Record<string, string> {
  if (config.kind === 'maia') {
    return { engine: 'maia', elo: config.rating.toString() };
  }
  return { skillLevel: config.skillLevel.toString() };
}

/**
 * Inverse of {@link engineConfigToUrlParams}. Missing / malformed params
 * fall back to {@link DEFAULT_ENGINE_CONFIG} rather than throwing —
 * URLs come from share-links and bookmarks, so we never want a typo to
 * 500 the page.
 */
export function engineConfigFromUrlParams(params: URLSearchParams): EngineConfig {
  const engineParam = params.get('engine');
  const engine: EngineKind = engineParam === 'maia' ? 'maia' : DEFAULT_ENGINE;

  if (engine === 'maia') {
    const parsedElo = parseInt(params.get('elo') ?? '');
    if (Number.isFinite(parsedElo) && isMaiaRating(parsedElo)) {
      return { kind: 'maia', rating: parsedElo };
    }
    return { kind: 'maia', rating: DEFAULT_MAIA_RATING };
  }

  const parsedLevel = parseInt(params.get('skillLevel') ?? '5');
  if (isValidSkillLevel(parsedLevel)) {
    return { kind: 'stockfish', skillLevel: parsedLevel };
  }
  return DEFAULT_ENGINE_CONFIG;
}
