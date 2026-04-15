import type { User } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import type { profiles } from '@/lib/db';

import { aggregateCountryStats } from './country-stats';

type Profile = typeof profiles.$inferSelect;

function makeUser(id: string): User {
  return {
    id,
    app_metadata: {},
    user_metadata: {},
    aud: '',
    created_at: '',
  } as User;
}

function makeProfile(id: string, country: string | null): Profile {
  return { id, country } as Profile;
}

describe('aggregateCountryStats', () => {
  it('returns an empty array for no users', () => {
    expect(aggregateCountryStats([], new Map())).toEqual([]);
  });

  it('counts users per country', () => {
    const users = [makeUser('a'), makeUser('b'), makeUser('c')];
    const profileMap = new Map<string, Profile>([
      ['a', makeProfile('a', 'JP')],
      ['b', makeProfile('b', 'JP')],
      ['c', makeProfile('c', 'US')],
    ]);
    expect(aggregateCountryStats(users, profileMap)).toEqual([
      { country: 'JP', count: 2 },
      { country: 'US', count: 1 },
    ]);
  });

  it('buckets missing profiles and missing country as "Unknown"', () => {
    const users = [makeUser('a'), makeUser('b'), makeUser('c')];
    const profileMap = new Map<string, Profile>([
      ['a', makeProfile('a', null)],
      ['b', makeProfile('b', 'JP')],
      // c has no profile at all
    ]);
    expect(aggregateCountryStats(users, profileMap)).toEqual([
      { country: 'Unknown', count: 2 },
      { country: 'JP', count: 1 },
    ]);
  });

  it('sorts results by count descending', () => {
    const users = Array.from({ length: 5 }, (_, i) => makeUser(String(i)));
    const profileMap = new Map<string, Profile>([
      ['0', makeProfile('0', 'A')],
      ['1', makeProfile('1', 'B')],
      ['2', makeProfile('2', 'B')],
      ['3', makeProfile('3', 'C')],
      ['4', makeProfile('4', 'C')],
    ]);
    const result = aggregateCountryStats(users, profileMap);
    expect(result[0].count).toBe(2);
    expect(result[result.length - 1].count).toBe(1);
  });
});
