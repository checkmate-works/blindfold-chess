'use server';

import * as Sentry from '@sentry/nextjs';
import type { User } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';

import { writeAdsHiddenCookieForUser } from '@/lib/ads/ads-hidden-cookie-writer';
import { getOptionalUser } from '@/lib/auth';
import { db, profiles } from '@/lib/db';

/**
 * The viewer's session and registration state, resolved server-side.
 *
 * `hasProfile` distinguishes a fully-registered member (a `profiles` row exists
 * — username set) from a *provisional* one (signed in but no profile yet; the
 * auth callback routes them to `setup-username`). The client uses it to prompt
 * registration completion instead of opening a composer for a provisional user.
 */
export type SessionUser = {
  user: User | null;
  hasProfile: boolean;
  /**
   * Header display fields from the same profile lookup that decides
   * `hasProfile` — two extra columns on an already-issued PK query, so the
   * header does not need a second round-trip (the former
   * `/api/header-profile` route) after auth resolves. `null` for anonymous
   * and provisional viewers alike.
   */
  profile: { avatarUrl: string | null; displayName: string | null } | null;
};

/**
 * Returns the currently-authenticated Supabase user, or `null` for anonymous
 * visitors. Invoked by `AuthProvider` on mount so the client can decide
 * whether to load the Supabase browser SDK.
 *
 * Reading the session on the server (instead of in the root layout) keeps
 * `[locale]/layout.tsx` free of `cookies()` reads, which is the prerequisite
 * for ISR on descendant pages (see F-003 Group A).
 *
 * Any failure (misconfigured env, transient server error, etc.) is coerced
 * to `null` so the client renders as unauthenticated rather than erroring.
 * Auth-resolution failures (e.g. `getOptionalUser()` throwing due to a
 * cookie-decode error, transient Supabase outage, or env misconfiguration)
 * are reported to Sentry before the null is returned, so a real
 * authenticated user silently appearing as anonymous is observable in
 * operations instead of going unnoticed.
 *
 * @sideEffect Also refreshes the `bfc_ads_hidden` cookie from the user's
 * current ad-free entitlement. This is how cancelled subscriptions stop
 * hiding ads without waiting for the cookie's 7-day TTL to expire: the
 * underlying entitlement queries (`hasActiveSubscription`, `hasActiveGrant`)
 * are tag-cached with `revalidate: 60`, so at most 60 s after a Stripe
 * webhook (`customer.subscription.deleted`) or admin `revokeGrant`, the next
 * `getSessionUser()` call recomputes the entitlement and rewrites the
 * cookie. The cookie refresh is wrapped in its own try/catch so a DB
 * hiccup never breaks the auth path (AuthProvider correctness depends on
 * this function always resolving). Cookie-writer failures are intentionally
 * NOT sent to Sentry — entitlement queries already log at a lower layer via
 * `console.warn`, and a DB blip here is cosmetic rather than an auth signal.
 */
export async function getSessionUser(): Promise<SessionUser> {
  let user: User | null = null;
  try {
    user = await getOptionalUser();
  } catch (error) {
    Sentry.captureException(error);
    return { user: null, hasProfile: false, profile: null };
  }

  // Whether this signed-in user has completed registration (has a profile row).
  // Cheap primary-key lookup. A failure is coerced to `false`: showing the
  // "finish registration" prompt is the safe default, and the server-side
  // profile guard is the real gate for content mutations.
  let hasProfile = false;
  let profile: SessionUser['profile'] = null;
  if (user) {
    try {
      const [row] = await db
        .select({
          id: profiles.id,
          avatarUrl: profiles.avatarUrl,
          displayName: profiles.displayName,
        })
        .from(profiles)
        .where(eq(profiles.id, user.id))
        .limit(1);
      hasProfile = row != null;
      profile = row
        ? { avatarUrl: row.avatarUrl ?? null, displayName: row.displayName ?? null }
        : null;
    } catch {
      hasProfile = false;
      profile = null;
    }
  }

  try {
    await writeAdsHiddenCookieForUser(user);
  } catch {
    // Cookie refresh must never fail the auth check. A transient DB error
    // here leaves the cookie in its previous state; it will self-correct
    // on the next page load. The cookie's 7-day TTL also bounds the lag.
  }

  return { user, hasProfile, profile };
}
