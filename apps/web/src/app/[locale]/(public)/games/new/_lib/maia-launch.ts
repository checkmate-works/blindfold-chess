import { DEFAULT_ENGINE, type EngineKind } from '@/lib/engines';
import type { MaiaEngineAccess } from '@/lib/users/can-use-maia';
import { isMaiaUnlockedAtLevel } from '@/lib/users/maia-unlock-level';

/**
 * How the Maia card renders in the engine selector:
 *
 * - `unlocked` — viewer at or above `MAIA_UNLOCK_LEVEL`: selectable.
 * - `locked`   — viewer below it (or signed out): the card is not
 *                selectable; tapping it opens the modal that names the level
 *                that unlocks Maia.
 */
export type MaiaCardMode = 'unlocked' | 'locked';

/**
 * Derive the Maia card mode from server-resolved access state. Shared by
 * every `/games/new/*` form so the three engine selectors stay consistent.
 */
export function deriveMaiaCardMode(access: MaiaEngineAccess): MaiaCardMode {
  return isMaiaUnlockedAtLevel(access.level) ? 'unlocked' : 'locked';
}

/**
 * Engine to preselect on a game-creation form, from its `?engine=` search
 * param. The value vocabulary mirrors `engineConfigFromUrlParams` on the
 * play route (`maia`, else the default), so a link that names an engine
 * reads the same on both.
 *
 * A locked Maia card wins over the param: clicking a locked card never
 * selects it (it opens the unlock modal instead), so arriving by URL must
 * not manufacture a selected-but-locked state that no sequence of clicks
 * can produce.
 */
export function initialEngineKind(
  engineParam: string | null,
  maiaCardMode: MaiaCardMode
): EngineKind {
  return engineParam === 'maia' && maiaCardMode !== 'locked' ? 'maia' : DEFAULT_ENGINE;
}
