import type { EngineConfig } from './config';

/**
 * Compact, user-facing label for an {@link EngineConfig} suitable for
 * dense list rows ("Level 5" / "Maia 1600"). Receives the translation
 * function rather than calling `useTranslations` itself so the helper
 * is usable from both client and server components.
 *
 * The Stockfish form intentionally drops the engine name to match the
 * pre-Maia UX where every saved game was Stockfish and the bare level
 * was unambiguous. Maia rows show the engine name because the Elo
 * alone could be read as a "player rating" rather than an opponent
 * configuration.
 */
export function formatEngineConfigLabel(config: EngineConfig, t: (key: string) => string): string {
  if (config.kind === 'maia') {
    return `Maia ${config.rating}`;
  }
  return `${t('level')} ${config.skillLevel}`;
}
