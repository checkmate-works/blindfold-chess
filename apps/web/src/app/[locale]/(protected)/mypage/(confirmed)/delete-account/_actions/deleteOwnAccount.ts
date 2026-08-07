'use server';

import { authenticateAndGuard } from '@/lib/auth';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { deleteAccount } from '@/lib/users/delete-account';

export type DeleteOwnAccountResult = { success: true } | { error: string };

/**
 * Delete the caller's own account (anonymizing retained UGC — see
 * `deleteAccount` for the policy). The client signs the user out and
 * redirects after a successful call.
 */
export async function deleteOwnAccount(): Promise<DeleteOwnAccountResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.deleteAccount);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  const result = await deleteAccount(user.id);
  if (!result.ok) {
    return { error: result.error };
  }

  return { success: true };
}
