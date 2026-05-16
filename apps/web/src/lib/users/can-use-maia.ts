import { and, eq } from 'drizzle-orm';
import 'server-only';

import { hasActiveSubscription } from '@/lib/billing/subscription';
import { db, pointEvents } from '@/lib/db';
import { MAIA_GAME_SOURCE, getPointBalanceSummary } from '@/lib/points';

/**
 * Maia engine access state for the `/games/new/*` engine selectors.
 *
 * - `exempt`           — active subscription: Maia is free and unlimited;
 *                        no point charge on game start.
 * - `spendableBalance` — confirmed (non-pending) point balance. Only
 *                        meaningful when `exempt` is false; it decides
 *                        whether the Maia card is payable or locked.
 */
export type MaiaEngineAccess = {
  exempt: boolean;
  spendableBalance: number;
};

/**
 * Maia is free and unlimited for subscribers (any tier — Maia is a perk of
 * paying). Everyone else pays a per-game point charge; there is no
 * `maia_access` user-grant. For testing, an admin can top up a user's
 * points via `/admin/points` and the per-game flow takes over from there.
 */
async function isMaiaExempt(userId: string): Promise<boolean> {
  return hasActiveSubscription(userId);
}

/**
 * Whether the user has ever paid a point for a Maia game. Used by the
 * model-download gate below — a first per-game charge is the moment a
 * non-subscriber becomes allowed to fetch the ONNX model.
 */
async function hasPaidForMaiaGame(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: pointEvents.id })
    .from(pointEvents)
    .where(and(eq(pointEvents.userId, userId), eq(pointEvents.source, MAIA_GAME_SOURCE)))
    .limit(1);
  return rows.length > 0;
}

/**
 * Maia model-download gate.
 *
 * Returns `true` when the user may fetch the 46 MB ONNX model from
 * `/api/engines/maia/[file]`. Two paths:
 *   1. An active subscription (Maia is exempt from the per-game charge).
 *   2. The user has paid a point for at least one Maia game — once a
 *      non-subscriber has been charged once, the per-game point flow has
 *      vouched for them and the (immutable-cached) model may be served.
 *
 * Unauthenticated users always return `false`.
 *
 * Used by:
 *   1. **Server-side enforcement** — `/api/engines/maia/[file]` calls this
 *      before reading the ONNX bytes off disk, so the 46 MB egress is
 *      unreachable for anonymous / unentitled callers.
 *   2. The page-level entitlement check is `getMaiaEngineAccess` — the
 *      engine selector needs the payable-vs-locked distinction, which a
 *      single boolean cannot express.
 */
export async function canUseMaia(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  if (await isMaiaExempt(userId)) return true;
  return hasPaidForMaiaGame(userId);
}

/**
 * Resolve Maia access state for the `/games/new/*` engine selectors.
 * Anonymous users get `{ exempt: false, spendableBalance: 0 }` — the Maia
 * card renders locked and login is required upstream.
 */
export async function getMaiaEngineAccess(userId: string | null): Promise<MaiaEngineAccess> {
  if (!userId) return { exempt: false, spendableBalance: 0 };
  const [exempt, balance] = await Promise.all([
    isMaiaExempt(userId),
    getPointBalanceSummary(userId),
  ]);
  return { exempt, spendableBalance: balance.total };
}

export { isMaiaExempt };
