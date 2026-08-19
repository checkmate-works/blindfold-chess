import type { User } from '@supabase/supabase-js';

import type { Profile } from '@/lib/db/schema';

export type CountryStat = {
  country: string;
  count: number;
};

/**
 * Bucket key for users with no country set. Deliberately NOT a two-letter ISO
 * code, so consumers must special-case it — passing it to `countryCodeToFlag`
 * would map each letter to a regional-indicator emoji and produce garbage.
 */
export const UNKNOWN_COUNTRY = 'Unknown';

/**
 * Aggregate user counts grouped by country.
 *
 * Pure function — takes the already-fetched filtered population and
 * associated profile map, and produces a sorted list of country counts.
 * Users without a profile or without a country field are bucketed as
 * `UNKNOWN_COUNTRY`.
 */
export function aggregateCountryStats(
  users: User[],
  profileMap: Map<string, Profile>
): CountryStat[] {
  const countMap = new Map<string, number>();
  for (const user of users) {
    const profile = profileMap.get(user.id);
    const country = profile?.country ?? UNKNOWN_COUNTRY;
    countMap.set(country, (countMap.get(country) ?? 0) + 1);
  }

  return Array.from(countMap.entries())
    .map(([country, cnt]) => ({ country, count: cnt }))
    .sort((a, b) => b.count - a.count);
}
