'use server';

import { validateUsername } from '@blindfold-chess/features/username';

import { authenticateAndGuard, userHasProfile } from '@/lib/auth';
import { isLameName } from '@/lib/content/lame-name';
import { db, profiles } from '@/lib/db';
import { isUniqueViolation } from '@/lib/db/extract-pg-error-code';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

export type SetUsernameInput = {
  username?: string;
  displayName?: string;
};

export type SetUsernameResult = { success: true } | { error: string };

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
  const { user } = guardResult;

  const username = input.username?.trim();
  if (!username) {
    return { error: 'username_required' };
  }

  const displayName = input.displayName?.trim() || username;

  const validationError = validateUsername(username);
  if (validationError) {
    return { error: validationError };
  }

  if (isLameName(username)) {
    return { error: 'username_inappropriate' };
  }

  if (isLameName(displayName)) {
    return { error: 'display_name_inappropriate' };
  }

  // Check if profile already exists (prevent double creation)
  if (await userHasProfile(user.id)) {
    return { error: 'username_already_set' };
  }

  // Create profile with chosen username.
  // The DB UNIQUE constraint on username handles race conditions.
  try {
    await db.insert(profiles).values({
      id: user.id,
      username,
      displayName,
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { error: 'username_taken' };
    }
    throw e;
  }

  return { success: true };
}
