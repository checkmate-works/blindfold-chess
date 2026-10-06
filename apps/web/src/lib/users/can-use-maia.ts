import 'server-only';

import { getUserLevel } from '@/lib/db/get-user-level';
import { getPointBalanceSummary, hasMaiaGameCharge } from '@/lib/points';

import { isMaiaFreeAtLevel } from './maia-free-level';

/**
 * Maia engine access state for the `/games/new/*` engine selectors.
 *
 * - `level`            — the viewer's current Exp level. At or above
 *                        `MAIA_FREE_LEVEL` the Maia card renders free and
 *                        no coin is charged.
 * - `spendableBalance` — confirmed (non-pending) point balance. Below the
 *                        free level, decides whether the Maia card renders
 *                        payable or locked.
 */
export type MaiaEngineAccess = {
  level: number;
  spendableBalance: number;
};

/**
 * Whether the user's level exempts them from the per-game Maia coin charge.
 * The single server-side source for that decision — `startMaiaGame` consults
 * it before charging, and `canUseMaia` before serving the model — so the
 * page's "free" badge and the server's billing can never disagree.
 */
export async function isMaiaFreeForUser(userId: string): Promise<boolean> {
  return isMaiaFreeAtLevel(await getUserLevel(userId));
}

/**
 * Maia model-download gate.
 *
 * Returns `true` when the user may fetch the 46 MB ONNX model from
 * `/api/engines/maia/[file]`. Two facts vouch for the caller:
 *
 *   1. Their level is at or above `MAIA_FREE_LEVEL` — Maia is free for
 *      them, so there is no ledger row to look for.
 *   2. They have spent a coin on at least one Maia game. Below the free
 *      level every game costs one coin, so a single `maia_game` ledger row
 *      proves they paid their way in and the (immutable-cached) model may
 *      be served.
 *
 * Unauthenticated users always return `false`.
 *
 * Used by:
 *   1. **Server-side enforcement** — `/api/engines/maia/[file]` calls this
 *      before reading the ONNX bytes off disk, so the 46 MB egress is
 *      unreachable for anonymous / unentitled callers.
 *   2. The page-level entitlement check is `getMaiaEngineAccess` — the
 *      engine selector needs the free / payable / locked distinction,
 *      which a single boolean cannot express.
 */
export async function canUseMaia(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  if (await isMaiaFreeForUser(userId)) return true;
  return hasMaiaGameCharge(userId);
}

/**
 * Resolve Maia access state for the `/games/new/*` engine selectors.
 * Anonymous users get `{ level: 0, spendableBalance: 0 }` — the Maia card
 * renders locked and login is required upstream.
 */
export async function getMaiaEngineAccess(userId: string | null): Promise<MaiaEngineAccess> {
  if (!userId) return { level: 0, spendableBalance: 0 };
  const [level, balance] = await Promise.all([
    getUserLevel(userId),
    getPointBalanceSummary(userId),
  ]);
  return { level, spendableBalance: balance.total };
}
