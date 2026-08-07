'use server';

import { eq } from 'drizzle-orm';

import { authenticateAndCheckBan } from '@/lib/auth';
import { db, profiles } from '@/lib/db';

export type SaveOnboardingProfileInput = {
  country: string;
  bio: string;
};

export type SaveOnboardingProfileResult =
  | { ok: true }
  | { ok: false; error: 'signInRequired' | 'banned' | 'invalidCountry' | 'bioTooLong' };

const BIO_MAX_LENGTH = 500;

/**
 * Persist the optional profile fields collected on the post-registration
 * onboarding step (country + bio).
 *
 * The general profile editor uses the `updateProfile` Server Action, which is
 * a *full overwrite* (it requires `displayName` and nulls out every field it
 * does not receive). Reusing it from onboarding — where we only collect a
 * subset — would wipe the rest of the profile. This action updates just those
 * columns instead. The avatar is saved separately and immediately by
 * `AvatarUpload` via `POST /api/profile/avatar`, so it is intentionally not
 * touched here.
 */
export async function saveOnboardingProfile(
  input: SaveOnboardingProfileInput
): Promise<SaveOnboardingProfileResult> {
  const auth = await authenticateAndCheckBan();
  if ('error' in auth) {
    return { ok: false, error: auth.error === 'banned' ? 'banned' : 'signInRequired' };
  }

  const country = input.country.trim().toUpperCase() || null;
  if (country && !/^[A-Z]{2}$/.test(country)) {
    return { ok: false, error: 'invalidCountry' };
  }

  const bio = input.bio.trim() || null;
  if (bio && bio.length > BIO_MAX_LENGTH) {
    return { ok: false, error: 'bioTooLong' };
  }

  await db
    .update(profiles)
    .set({ country, bio, updatedAt: new Date() })
    .where(eq(profiles.id, auth.user.id));

  return { ok: true };
}
