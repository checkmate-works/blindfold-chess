'use server';

import { eq } from 'drizzle-orm';

import { authenticateAndGuard } from '@/lib/auth';
import { isLameName } from '@/lib/content/lame-name';
import { isValidCountryCode } from '@/lib/countries';
import { db, profiles } from '@/lib/db';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';

export type UpdateProfileInput = {
  displayName?: string;
  bio?: string;
  country?: string;
  flair?: string;
  fideId?: string;
  chesscomUsername?: string;
  lichessUsername?: string;
  xUsername?: string;
  instagramUsername?: string;
  youtubeHandle?: string;
};

export type UpdateProfileResult = { success: true } | { error: string };

/**
 * Full-overwrite update of the caller's own profile: every field it does not
 * receive is nulled out. Partial editors (e.g. onboarding) must not reuse it —
 * see `saveOnboardingProfile` for the column-scoped alternative.
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

  // Display name does not require uniqueness (same approach as X/Instagram).
  // Username serves as the unique identifier.
  const displayName = input.displayName?.trim();
  if (!displayName) {
    return { error: 'display_name_required' };
  }
  if (displayName.length > 50) {
    return { error: 'display_name_too_long' };
  }
  if (isLameName(displayName)) {
    return { error: 'display_name_inappropriate' };
  }

  const bio = input.bio?.trim() || null;
  if (bio && bio.length > 500) {
    return { error: 'bio_too_long' };
  }

  // Real ISO 3166-1 alpha-2 membership, matching the client-side rule in
  // `../_lib/profile-validation.ts`. A bare two-letter regex here used to
  // accept codes like "ZZ" that the client form rejects.
  const country = input.country?.trim().toUpperCase() || null;
  if (country && !isValidCountryCode(country)) {
    return { error: 'invalid_country' };
  }

  const flair = input.flair?.trim() || null;
  if (flair && flair.length > 50) {
    return { error: 'flair_too_long' };
  }
  const fideId = input.fideId?.trim() || null;
  if (fideId && fideId.length > 50) {
    return { error: 'fide_id_too_long' };
  }
  if (fideId && !/^\d+$/.test(fideId)) {
    return { error: 'fide_id_invalid_format' };
  }
  const chesscomUsername = input.chesscomUsername?.trim() || null;
  if (chesscomUsername && chesscomUsername.length > 255) {
    return { error: 'chesscom_username_too_long' };
  }
  if (chesscomUsername && !/^[a-zA-Z0-9_-]+$/.test(chesscomUsername)) {
    return { error: 'chesscom_username_invalid_format' };
  }
  const lichessUsername = input.lichessUsername?.trim() || null;
  if (lichessUsername && lichessUsername.length > 255) {
    return { error: 'lichess_username_too_long' };
  }
  if (lichessUsername && !/^[a-zA-Z0-9_-]+$/.test(lichessUsername)) {
    return { error: 'lichess_username_invalid_format' };
  }
  const xUsername = input.xUsername?.trim() || null;
  if (xUsername && xUsername.length > 15) {
    return { error: 'x_username_too_long' };
  }
  if (xUsername && !/^[a-zA-Z0-9_]+$/.test(xUsername)) {
    return { error: 'x_username_invalid_format' };
  }
  const instagramUsername = input.instagramUsername?.trim() || null;
  if (instagramUsername && instagramUsername.length > 30) {
    return { error: 'instagram_username_too_long' };
  }
  if (instagramUsername && !/^[a-zA-Z0-9._]+$/.test(instagramUsername)) {
    return { error: 'instagram_username_invalid_format' };
  }
  const youtubeHandle = input.youtubeHandle?.trim() || null;
  if (youtubeHandle && youtubeHandle.length > 30) {
    return { error: 'youtube_handle_too_long' };
  }
  if (youtubeHandle && !/^[a-zA-Z0-9._-]+$/.test(youtubeHandle)) {
    return { error: 'youtube_handle_invalid_format' };
  }

  const nextValues = {
    displayName,
    bio,
    country,
    flair,
    fideId,
    chesscomUsername,
    lichessUsername,
    xUsername,
    instagramUsername,
    youtubeHandle,
  };

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
  const changes: Record<string, { from: string | null; to: string | null }> = {};
  for (const key of Object.keys(nextValues) as (keyof typeof nextValues)[]) {
    const from = previous?.[key] ?? null;
    const to = nextValues[key] ?? null;
    if (from !== to) {
      changes[key] = { from, to };
    }
  }

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
