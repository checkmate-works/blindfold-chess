'use server';

import { revalidateTag } from 'next/cache';

import { validateUsername } from '@blindfold-chess/features/username';

import { authenticateAndGuard, userHasProfile } from '@/lib/auth';
import { profileCacheTag } from '@/lib/cache-tags';
import { isLameName } from '@/lib/content/lame-name';
import { db, profiles } from '@/lib/db';
import { isUniqueViolation } from '@/lib/db/extract-pg-error-code';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { DISPLAY_NAME_MAX_LENGTH } from '@/lib/users/profile-limits';

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

  // The setup form caps this field with `maxLength`, which constrains typing
  // only — a request that does not come from that form is bounded by nothing
  // but the column's varchar(255). Without this check the over-long name is
  // stored, and the user lands on a profile that `/mypage/profile` — which
  // does enforce the limit — refuses to save: their first edit there fails
  // with `display_name_too_long` for a field they did not touch. The fallback
  // above means an omitted display name is the username, which
  // `validateUsername` has already capped well below this.
  if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return { error: 'display_name_too_long' };
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

  // `/u/[username]` caches its lookup per username, misses included, so a
  // crawler that walked this name while it was still free may hold a cached
  // `null` for it. Expire that entry now or the brand-new profile 404s for up
  // to an hour.
  revalidateTag(profileCacheTag(username), { expire: 0 });

  return { success: true };
}
