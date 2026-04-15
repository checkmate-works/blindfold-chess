import type { User } from '@supabase/supabase-js';

import { SIGNUP_METHOD_ORDER, type SignupMethod } from '../signup-method';

export type SignupMethodStat = {
  method: SignupMethod;
  count: number;
};

/**
 * Classify a Supabase auth user's signup provider into one of three buckets:
 * `google`, `email`, or `unknown` (any other / missing provider).
 *
 * Reads `user.app_metadata.provider` first (the canonical field), falling back
 * to the first entry of `user.identities` for legacy rows.
 *
 * Pure function — no DB or network access. Exposed for direct import in
 * `page.tsx` (the admin users table renders each row's signup method).
 */
export function getSignupMethod(user: User): SignupMethod {
  const appMetaProvider =
    typeof user.app_metadata === 'object' && user.app_metadata !== null
      ? (user.app_metadata as Record<string, unknown>).provider
      : undefined;
  const identityProvider = user.identities?.[0]?.provider;
  const provider =
    typeof appMetaProvider === 'string' && appMetaProvider.length > 0
      ? appMetaProvider
      : typeof identityProvider === 'string' && identityProvider.length > 0
        ? identityProvider
        : '';

  if (provider === 'google') return 'google';
  if (provider === 'email') return 'email';
  return 'unknown';
}

/**
 * Aggregate user counts grouped by signup method (google / email / unknown).
 *
 * Always returns all three buckets in a fixed order (google → email → unknown),
 * even when a bucket is empty, so the chart is stable across renders.
 *
 * Pure function — takes the already-fetched population and computes stats.
 */
export function aggregateSignupMethodStats(users: User[]): SignupMethodStat[] {
  const countMap = new Map<SignupMethod, number>();
  for (const method of SIGNUP_METHOD_ORDER) countMap.set(method, 0);
  for (const user of users) {
    const method = getSignupMethod(user);
    countMap.set(method, (countMap.get(method) ?? 0) + 1);
  }

  return SIGNUP_METHOD_ORDER.map((method) => ({
    method,
    count: countMap.get(method) ?? 0,
  }));
}
