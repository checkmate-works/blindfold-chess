import type { MaiaEngineAccess } from '@/lib/users/can-use-maia';

/**
 * How the Maia card renders in the engine selector:
 *
 * - `payable` — viewer with enough coins: selectable, shows a per-game
 *               cost badge; starting a game charges the coins.
 * - `locked`  — viewer who cannot afford one game: the card is not
 *               selectable; tapping it opens the coin-info modal.
 */
export type MaiaCardMode = 'payable' | 'locked';

/**
 * Derive the Maia card mode from server-resolved access state and the
 * per-game coin cost. Shared by every `/games/new/*` form so the three
 * engine selectors stay consistent.
 */
export function deriveMaiaCardMode(access: MaiaEngineAccess, cost: number): MaiaCardMode {
  return access.spendableBalance >= cost ? 'payable' : 'locked';
}
