import { isValidSkillLevel } from '@blindfold-chess/features/ai-game';
import {
  DEFAULT_MAIA_RATING,
  type MaiaRating,
  isMaiaRating,
} from '@blindfold-chess/features/ai-game/maia';

import type { SkillLevel } from '@/lib/games/saved-game-types';

import { DEFAULT_ENGINE, type EngineKind } from './types';

/**
 * Engine + difficulty as a single discriminated union.
 *
 * The two engines we ship today (Stockfish and Maia) take fundamentally
 * different difficulty knobs — Stockfish reads a 1..20 skill level the
 * UCI engine consumes directly, while Maia reads an Elo from its
 * official 600..2600 catalog. Modelling them as one nominal
 * `{ skillLevel, maiaRating, engine }` triple invites "engine='maia'
 * but maiaRating is undefined" inconsistencies; the union below makes
 * those states unrepresentable.
 *
 * Adding a new engine means appending one variant here and one factory
 * branch in `useAiVersus`. Consumers that already pattern-match on
 * `kind` get an exhaustiveness check for free.
 */
export type EngineConfig =
  | { kind: 'stockfish'; skillLevel: SkillLevel }
  | { kind: 'maia'; rating: MaiaRating };

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  kind: 'stockfish',
  skillLevel: 5 as SkillLevel,
};

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

/**
 * Runtime narrowing used by the localStorage repository when validating
 * persisted records — `unknown` in, `EngineConfig` out. Keeps the
 * validator a single comprehensible expression instead of duplicating
 * the discriminator logic everywhere.
 */
export function isEngineConfig(value: unknown): value is EngineConfig {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.kind === 'stockfish') {
    return typeof v.skillLevel === 'number' && isValidSkillLevel(v.skillLevel);
  }
  if (v.kind === 'maia') {
    return typeof v.rating === 'number' && isMaiaRating(v.rating);
  }
  return false;
}
