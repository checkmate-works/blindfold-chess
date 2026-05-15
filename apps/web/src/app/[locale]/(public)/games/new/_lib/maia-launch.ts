import type { MaiaEngineAccess } from '@/lib/users/can-use-maia';

/**
 * How the Maia card renders in the engine selector:
 *
 * - `free`    — Maia-exempt viewer (an active subscription): selectable,
 *               no point charge.
 * - `payable` — non-exempt viewer with enough points: selectable, shows a
 *               per-game cost badge; starting a game charges the points.
 * - `locked`  — non-exempt viewer who cannot afford one game: the card is
 *               not selectable; tapping it opens the point-info modal.
 */
export type MaiaCardMode = 'free' | 'payable' | 'locked';

/**
 * Derive the Maia card mode from server-resolved access state and the
 * per-game point cost. Shared by every `/games/new/*` form so the three
 * engine selectors stay consistent.
 */
export function deriveMaiaCardMode(access: MaiaEngineAccess, cost: number): MaiaCardMode {
  if (access.exempt) return 'free';
  return access.spendableBalance >= cost ? 'payable' : 'locked';
}
