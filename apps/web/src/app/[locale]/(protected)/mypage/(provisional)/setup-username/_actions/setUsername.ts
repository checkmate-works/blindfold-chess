'use server';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import type { CreateProfileInput } from '@/lib/users/create-profile';
import { createProfileForUser } from '@/lib/users/create-profile';

export type SetUsernameInput = CreateProfileInput;

export type SetUsernameResult = ActionResult;

/**
 * Create the caller's `profiles` row with their chosen (immutable) username.
 * One-shot by design: a second call fails with `username_already_set`.
 *
 * Error codes are the ones `UsernameForm.getValidationMessage` maps to i18n
 * messages; unknown codes fall back to a generic message.
 */
export async function setUsername(input: SetUsernameInput): Promise<SetUsernameResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.setupUsername);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  return createProfileForUser(guardResult.user.id, input);
}
