import 'server-only';

import { hasActiveSubscription } from '@/lib/billing/subscription';
import { hasActiveGrant } from '@/lib/users/user-grants';

/**
 * Maia engine entitlement check.
 *
 * Two paths to access:
 *   1. The user has an active paid subscription (any tier; Maia is a
 *      perk of paying, not a separate SKU).
 *   2. The user has an active `maia_access` user-grant — granted either
 *      by an admin from `/admin/grants` or by a future automated trigger
 *      (campaign, redemption code, etc.).
 *
 * Unauthenticated users always return `false` — Maia is a paid / granted
 * feature.
 *
 * Used in two places:
 *
 *   1. **UI product gating** — the engine selector under `/games/new/*`
 *      calls this to lock the Maia card for non-eligible users.
 *   2. **Server-side enforcement** — the `/api/engines/maia/[file]`
 *      route handler calls this before reading the ONNX bytes off
 *      disk, so the 46 MB egress is unreachable for unauthenticated
 *      or unentitled callers. The model file is no longer served
 *      from `public/`; the only way to obtain it is through that
 *      handler.
 */
export async function canUseMaia(userId: string | null): Promise<boolean> {
  if (!userId) return false;

  const [hasSub, hasGrant] = await Promise.all([
    hasActiveSubscription(userId),
    hasActiveGrant(userId, 'maia_access'),
  ]);

  return hasSub || hasGrant;
}
