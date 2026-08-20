'use server';

import { eq } from 'drizzle-orm';

import { authenticateAndGuard } from '@/lib/auth';
import { isLameName } from '@/lib/content/lame-name';
import { db, profiles } from '@/lib/db';
import { diffFields } from '@/lib/db/diff-fields';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';

import type { ProfileInput } from '../_lib/validate-profile-input';
import { PROFILE_WRITE_KEYS, validateProfileInput } from '../_lib/validate-profile-input';

export type UpdateProfileInput = ProfileInput;

export type UpdateProfileResult = { success: true } | { error: string };

/**
 * Full-overwrite update of the caller's own profile: every field it does not
 * receive is nulled out. Partial editors (e.g. onboarding) must not reuse it —
 * see `saveOnboardingProfile` for the column-scoped alternative.
 *
 * Field rules live in `../_lib/validate-profile-input`; this function owns
 * only the guard, the read-before-write, the update and the audit log.
 *
 * Error codes are the keys of `SERVER_ERROR_MAP` in
 * `../_lib/profile-validation.ts`; unknown codes fall back to a generic
 * message on the client.
 */
export async function updateProfile(input: UpdateProfileInput): Promise<UpdateProfileResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.updateProfile);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  const validated = validateProfileInput(input, { isLameName });
  if (!validated.ok) {
    return { error: validated.error };
  }
  const nextValues = validated.values;

  // Read the current values BEFORE overwriting them. Unlike UGC tables (which
  // soft-delete and keep history), a profile row retains no record of prior
  // values — once overwritten, the old displayName / social handles are
  // unrecoverable. That makes a profile edit a genuinely non-derivable event,
  // which is exactly what the activity log exists to capture (e.g. tracing an
  // impersonation attempt that swaps display names). We therefore log the
  // overwritten values, not just the bare fact that an edit happened.
  const [previous] = await db
    .select({
      displayName: profiles.displayName,
      bio: profiles.bio,
      country: profiles.country,
      flair: profiles.flair,
      fideId: profiles.fideId,
      chesscomUsername: profiles.chesscomUsername,
      lichessUsername: profiles.lichessUsername,
      xUsername: profiles.xUsername,
      instagramUsername: profiles.instagramUsername,
      youtubeHandle: profiles.youtubeHandle,
    })
    .from(profiles)
    .where(eq(profiles.id, user.id));

  await db
    .update(profiles)
    .set({ ...nextValues, updatedAt: new Date() })
    .where(eq(profiles.id, user.id));

  // Record only the fields that actually changed, each with its overwritten
  // ("from") and new ("to") value. If nothing changed there is nothing worth
  // logging.
  const changes = diffFields(previous ?? {}, nextValues, PROFILE_WRITE_KEYS);

  if (Object.keys(changes).length > 0) {
    logActivityEvent({
      userId: user.id,
      action: 'update_profile',
      targetType: 'user',
      targetId: user.id,
      metadata: { changes },
    });
  }

  return { success: true };
}
