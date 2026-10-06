import { DEFAULT_ENGINE, type EngineKind } from '@/lib/engines';
import type { MaiaEngineAccess } from '@/lib/users/can-use-maia';
import { isMaiaFreeAtLevel } from '@/lib/users/maia-free-level';

/**
 * How the Maia card renders in the engine selector:
 *
 * - `free`    — viewer at or above `MAIA_FREE_LEVEL`: selectable, shows a
 *               "free" badge; starting a game charges nothing and skips
 *               the coin confirmation.
 * - `payable` — viewer below the free level with enough coins: selectable,
 *               shows a per-game cost badge; starting a game charges the
 *               coins after a confirmation.
 * - `locked`  — viewer below the free level who cannot afford one game:
 *               the card is not selectable; tapping it opens the coin-info
 *               modal, which also names the level that unlocks Maia.
 */
export type MaiaCardMode = 'free' | 'payable' | 'locked';

/**
 * Derive the Maia card mode from server-resolved access state and the
 * per-game coin cost. Shared by every `/games/new/*` form so the three
 * engine selectors stay consistent. Level wins over balance: a free-tier
 * player with zero coins is `free`, not `locked`.
 */
export function deriveMaiaCardMode(access: MaiaEngineAccess, cost: number): MaiaCardMode {
  if (isMaiaFreeAtLevel(access.level)) return 'free';
  return access.spendableBalance >= cost ? 'payable' : 'locked';
}

/**
 * Engine to preselect on a game-creation form, from its `?engine=` search
 * param. The value vocabulary mirrors `engineConfigFromUrlParams` on the
 * play route (`maia`, else the default), so a link that names an engine
 * reads the same on both — /mypage/coins uses this to land its Maia spend
 * card on the standard form with Maia already chosen.
 *
 * A locked Maia card wins over the param: clicking a locked card never
 * selects it (it opens the coin-info modal instead), so arriving by URL
 * must not manufacture a selected-but-locked state that no sequence of
 * clicks can produce.
 */
export function initialEngineKind(
  engineParam: string | null,
  maiaCardMode: MaiaCardMode
): EngineKind {
  return engineParam === 'maia' && maiaCardMode !== 'locked' ? 'maia' : DEFAULT_ENGINE;
}
