'use server';

import type { User } from '@supabase/supabase-js';

import { writeAdsHiddenCookieForUser } from '@/lib/ads/ads-hidden-cookie-writer';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';

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
 * this function always resolving).
 */
export async function getSessionUser(): Promise<User | null> {
  let user: User | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: resolvedUser },
    } = await supabase.auth.getUser();
    user = resolvedUser;
  } catch {
    return null;
  }

  try {
    await writeAdsHiddenCookieForUser(user);
  } catch {
    // Cookie refresh must never fail the auth check. A transient DB error
    // here leaves the cookie in its previous state; it will self-correct
    // on the next page load. The cookie's 7-day TTL also bounds the lag.
  }

  return user;
}
