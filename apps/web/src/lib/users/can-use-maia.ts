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
 * Note: this check is currently advisory (the ONNX model file under
 * `/engines/maia/` is publicly served and consumed by a Module Worker in
 * the user's browser, so a determined user can still drive the engine by
 * crafting URLs). It exists for **product gating** — hiding Maia in the
 * engine selector UI for non-eligible users — not for enforcement.
 * Promoting this to a true gate requires moving the model behind an
 * authenticated route (signed URL, API handler with auth, etc.), which
 * is deferred to the subscription paywall rollout.
 */
export async function canUseMaia(userId: string | null): Promise<boolean> {
  if (!userId) return false;

  const [hasSub, hasGrant] = await Promise.all([
    hasActiveSubscription(userId),
    hasActiveGrant(userId, 'maia_access'),
  ]);

  return hasSub || hasGrant;
}
