/**
 * The chess opponents the app ships, as the one list everything else derives
 * from — the union, the runtime guard, and the DB column's `$type`.
 *
 * New engines plug in by extending this array and adding a branch in
 * `useAiVersus`'s dispatch.
 */
export const ENGINE_KINDS = ['stockfish', 'maia'] as const;

/**
 * Discriminator over {@link ENGINE_KINDS}. Used to route UI selections and URL
 * parameters through to the right factory in `useAiVersus`.
 */
export type EngineKind = (typeof ENGINE_KINDS)[number];

export const DEFAULT_ENGINE: EngineKind = 'stockfish';

export function isEngineKind(value: unknown): value is EngineKind {
  return ENGINE_KINDS.includes(value as EngineKind);
}
