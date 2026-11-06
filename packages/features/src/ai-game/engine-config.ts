import { isMaiaRating, type MaiaRating } from "./maia/ratings";
import type { SkillLevel } from "./types";
import { isValidSkillLevel } from "./validators";

/**
 * The chess opponents the app ships, as the one list everything else derives
 * from — the union, the runtime guard, and the web DB column's `$type`.
 *
 * New engines plug in by extending this array and adding a factory branch
 * where each app dispatches on `kind` (`useAiVersus` on web).
 */
export const ENGINE_KINDS = ["stockfish", "maia"] as const;

/**
 * Discriminator over {@link ENGINE_KINDS}. Used to route UI selections and URL
 * parameters through to the right opponent factory.
 */
export type EngineKind = (typeof ENGINE_KINDS)[number];

export const DEFAULT_ENGINE: EngineKind = "stockfish";

export function isEngineKind(value: unknown): value is EngineKind {
  return ENGINE_KINDS.includes(value as EngineKind);
}

/**
 * Engine + difficulty as a single discriminated union.
 *
 * The two engines shipped today (Stockfish and Maia) take fundamentally
 * different difficulty knobs — Stockfish reads a 1..20 skill level the UCI
 * engine consumes directly, while Maia reads an Elo from its official
 * 600..2600 catalog. Modelling them as one nominal `{ skillLevel, maiaRating,
 * engine }` triple invites "engine='maia' but maiaRating is undefined"
 * inconsistencies; the union makes those states unrepresentable.
 *
 * Adding a new engine means appending one variant here and one factory branch
 * per app. Consumers that pattern-match on `kind` get an exhaustiveness check
 * for free.
 */
export type EngineConfig =
  | { kind: "stockfish"; skillLevel: SkillLevel }
  | { kind: "maia"; rating: MaiaRating };

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  kind: "stockfish",
  skillLevel: 5 as SkillLevel,
};

/**
 * Runtime narrowing for persisted records (a saved game read back from
 * storage) — `unknown` in, `EngineConfig` out. Keeps a stored-game validator a
 * single comprehensible expression instead of duplicating the discriminator
 * logic everywhere. An off-catalog rating is rejected, not repaired.
 */
export function isEngineConfig(value: unknown): value is EngineConfig {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.kind === "stockfish") {
    return typeof v.skillLevel === "number" && isValidSkillLevel(v.skillLevel);
  }
  if (v.kind === "maia") {
    return typeof v.rating === "number" && isMaiaRating(v.rating);
  }
  return false;
}
