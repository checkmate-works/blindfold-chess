'use server';

import { revalidateTag } from 'next/cache';

import { eq } from 'drizzle-orm';

import { authenticateAndCheckBan } from '@/lib/auth';
import { profileCacheTag } from '@/lib/cache-tags';
import { isValidCountryCode } from '@/lib/countries';
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

  // Real ISO 3166-1 alpha-2 membership, not merely two letters. A bare
  // two-letter regex here used to accept unassigned codes like "ZZ", which
  // this action — the trust boundary, since the form's own <select> is only a
  // convenience — would then write to `profiles.country`. Such a value fails
  // silently downstream: it renders as a broken flag, and ad country
  // targeting compares the column with the uppercase geo header by `===`, so
  // it simply never matches. Uppercasing first is required by the helper,
  // which is case-sensitive for the same reason.
  const country = input.country.trim().toUpperCase() || null;
  if (country && !isValidCountryCode(country)) {
    return { ok: false, error: 'invalidCountry' };
  }

  const bio = input.bio.trim() || null;
  if (bio && bio.length > BIO_MAX_LENGTH) {
    return { ok: false, error: 'bioTooLong' };
  }

  const [updated] = await db
    .update(profiles)
    .set({ country, bio, updatedAt: new Date() })
    .where(eq(profiles.id, auth.user.id))
    .returning({ username: profiles.username });

  // Both columns are rendered on the public profile, which caches the row per
  // username (see `profileCacheTag`).
  if (updated) {
    revalidateTag(profileCacheTag(updated.username), { expire: 0 });
  }

  return { ok: true };
}
