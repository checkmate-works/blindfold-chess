/**
 * Discriminator over the chess opponents the app ships. Used to route
 * UI selections and URL parameters through to the right factory in
 * `useAiVersus`. New engines plug in by extending this union and
 * adding a branch in the hook's dispatch.
 */
export type EngineKind = 'stockfish' | 'maia';

export const ENGINE_KINDS = ['stockfish', 'maia'] as const satisfies readonly EngineKind[];

export const DEFAULT_ENGINE: EngineKind = 'stockfish';

export function isEngineKind(value: unknown): value is EngineKind {
  return value === 'stockfish' || value === 'maia';
}
