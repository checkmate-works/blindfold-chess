'use server';

import type { IdentityRemovalBlocker } from '@blindfold-chess/features/account';
import { evaluateIdentityRemoval } from '@blindfold-chess/features/account';

import type { ActionResult } from '@/lib/action-types';
import type { AuthGuardError } from '@/lib/auth';
import { authenticateAndGuard } from '@/lib/auth';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { captureError } from '@/lib/sentry/capture-error';
import { createClient } from '@/lib/supabase/server';
import { logActivityEvent } from '@/lib/users/activity-log';
import { ensureEmailIdentity, getAccountLoginState } from '@/lib/users/login-methods';

/**
 * Why an unlink can fail.
 *
 * - `removal:*` — the guard refused ({@link IdentityRemovalBlocker}). The
 *   button is disabled by the same guard, so reaching this means the page
 *   was stale
 * - `unlinkFailed` — the auth server did not remove the identity
 */
export type UnlinkLoginIdentityError =
  AuthGuardError | `removal:${IdentityRemovalBlocker}` | 'unlinkFailed';

export type UnlinkLoginIdentityResult = ActionResult<
  Record<never, never>,
  UnlinkLoginIdentityError
>;

/**
 * Unlink a Google (or Apple) identity from the signed-in user's account.
 *
 * Runs the shared guard (`evaluateIdentityRemoval`), gives a password user the
 * `email` identity the auth server never created for them (it refuses to
 * delete an account's only identity), then asks the auth server to unlink
 * through the user's own session.
 *
 * @param identityId - `LinkedIdentity.id` of the identity to remove
 */
export async function unlinkLoginIdentity(identityId: string): Promise<UnlinkLoginIdentityResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.unlinkLoginIdentity);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  const state = await getAccountLoginState(user.id);
  const decision = evaluateIdentityRemoval(state, identityId);
  if (!decision.allowed) {
    return { error: `removal:${decision.reason}` };
  }
  const { identity } = decision;

  if (state.hasPassword && state.email !== undefined) {
    await ensureEmailIdentity(user.id, state.email, state.identities);
  }

  const supabase = await createClient();
  const { data: identitiesData, error: identitiesError } = await supabase.auth.getUserIdentities();
  const target = identitiesData?.identities.find((i) => i.identity_id === identity.id);
  if (identitiesError || !target) {
    return { error: 'removal:notLinked' };
  }
  const { error } = await supabase.auth.unlinkIdentity(target);
  if (error) {
    captureError(error, '[unlinkLoginIdentity] unlinkIdentity failed');
    return { error: 'unlinkFailed' };
  }

  logActivityEvent({
    userId: user.id,
    action: 'unlink_identity',
    metadata: { provider: identity.provider },
  });
  return { success: true };
}
