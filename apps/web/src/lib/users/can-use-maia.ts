import { and, eq } from 'drizzle-orm';
import 'server-only';

import { db, pointEvents } from '@/lib/db';
import { MAIA_GAME_SOURCE, getPointBalanceSummary } from '@/lib/points';

/**
 * Maia engine access state for the `/games/new/*` engine selectors.
 *
 * - `spendableBalance` — confirmed (non-pending) point balance. Decides
 *                        whether the Maia card renders payable or locked.
 */
export type MaiaEngineAccess = {
  spendableBalance: number;
};

/**
 * Whether the user has ever paid a coin for a Maia game. Used by the
 * model-download gate below — the first per-game charge is the moment a
 * user becomes allowed to fetch the ONNX model.
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
 * `/api/engines/maia/[file]`: the user has spent a coin on at least one
 * Maia game. Every Maia game costs one coin — there is no subscription
 * exemption — so a single `maia_game` ledger row vouches for the caller
 * and the (immutable-cached) model may be served.
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
  return hasPaidForMaiaGame(userId);
}

/**
 * Resolve Maia access state for the `/games/new/*` engine selectors.
 * Anonymous users get `{ spendableBalance: 0 }` — the Maia card renders
 * locked and login is required upstream.
 */
export async function getMaiaEngineAccess(userId: string | null): Promise<MaiaEngineAccess> {
  if (!userId) return { spendableBalance: 0 };
  const balance = await getPointBalanceSummary(userId);
  return { spendableBalance: balance.total };
}
