import type { User } from '@supabase/supabase-js';

import type { profiles } from '@/lib/db';

type Profile = typeof profiles.$inferSelect;

export type CountryStat = {
  country: string;
  count: number;
};

/**
 * Aggregate user counts grouped by country.
 *
 * Pure function — takes the already-fetched filtered population and
 * associated profile map, and produces a sorted list of country counts.
 * Users without a profile or without a country field are bucketed as 'Unknown'.
 */
export function aggregateCountryStats(
  users: User[],
  profileMap: Map<string, Profile>
): CountryStat[] {
  const countMap = new Map<string, number>();
  for (const user of users) {
    const profile = profileMap.get(user.id);
    const country = profile?.country ?? 'Unknown';
    countMap.set(country, (countMap.get(country) ?? 0) + 1);
  }

  return Array.from(countMap.entries())
    .map(([country, cnt]) => ({ country, count: cnt }))
    .sort((a, b) => b.count - a.count);
}
