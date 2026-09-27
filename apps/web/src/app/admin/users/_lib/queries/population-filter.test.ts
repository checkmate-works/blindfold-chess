import type { User } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import type { Profile } from '@/lib/db/schema';

import { type AdminUserFilters, EMPTY_ADMIN_USER_FILTERS } from '../filters';
import { UNKNOWN_COUNTRY } from './country-stats';
import { createPopulationFilter, groupRankSlugsByUser } from './population-filter';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    app_metadata: {},
    user_metadata: {},
    aud: '',
    created_at: '',
    ...overrides,
  } as User;
}

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user-1',
    username: 'alice',
    country: 'JP',
    deletedAt: null,
    bannedAt: null,
    ...overrides,
  } as Profile;
}

function filterWith(overrides: Partial<AdminUserFilters>) {
  return createPopulationFilter({ ...EMPTY_ADMIN_USER_FILTERS, ...overrides });
}

describe('groupRankSlugsByUser', () => {
  it('collects each user’s rank slugs and drops unknown rank ids', () => {
    const rankById = new Map([
      ['r1', { slug: '1kyu' }],
      ['r2', { slug: '1dan' }],
    ]);
    const result = groupRankSlugsByUser(
      [
        { userId: 'a', rankId: 'r1' },
        { userId: 'a', rankId: 'r2' },
        { userId: 'b', rankId: 'missing' },
      ],
      rankById
    );
    expect(result).toEqual(new Map([['a', new Set(['1kyu', '1dan'])]]));
  });
});

describe('createPopulationFilter', () => {
  it('accepts everyone when no filter is set', () => {
    const matches = filterWith({});
    expect(matches(makeUser(), undefined, undefined)).toBe(true);
    expect(matches(makeUser(), makeProfile({ deletedAt: new Date() }), undefined)).toBe(true);
  });

  describe('status', () => {
    const active = makeProfile();
    const banned = makeProfile({ bannedAt: new Date() });
    const deleted = makeProfile({ deletedAt: new Date() });
    const deletedAndBanned = makeProfile({ deletedAt: new Date(), bannedAt: new Date() });

    it.each([
      ['active', [true, false, false, false, false]],
      ['banned', [false, true, false, false, false]],
      ['deleted', [false, false, true, true, false]],
      ['anonymous', [false, false, false, false, true]],
    ] as const)('%s', (statusFilter, expected) => {
      const matches = filterWith({ statusFilter });
      const profiles = [active, banned, deleted, deletedAndBanned, undefined];
      expect(profiles.map((p) => matches(makeUser(), p, undefined))).toEqual(expected);
    });
  });

  it('buckets users without a country under UNKNOWN_COUNTRY', () => {
    const matches = filterWith({ countryFilter: UNKNOWN_COUNTRY });
    expect(matches(makeUser(), makeProfile({ country: null }), undefined)).toBe(true);
    expect(matches(makeUser(), undefined, undefined)).toBe(true);
    expect(matches(makeUser(), makeProfile({ country: 'JP' }), undefined)).toBe(false);
  });

  describe('rank', () => {
    it('matches a user only at their highest held rank', () => {
      const held = new Set(['1kyu', '1dan']);
      expect(filterWith({ rankFilter: '1dan' })(makeUser(), makeProfile(), held)).toBe(true);
      expect(filterWith({ rankFilter: '1kyu' })(makeUser(), makeProfile(), held)).toBe(false);
    });

    it('treats mukyu as holding no rank at all', () => {
      const matches = filterWith({ rankFilter: 'mukyu' });
      expect(matches(makeUser(), makeProfile(), undefined)).toBe(true);
      expect(matches(makeUser(), makeProfile(), new Set())).toBe(true);
      expect(matches(makeUser(), makeProfile(), new Set(['1kyu']))).toBe(false);
    });

    it('rejects a user with no ranks for a non-mukyu filter', () => {
      expect(filterWith({ rankFilter: '1kyu' })(makeUser(), makeProfile(), undefined)).toBe(false);
    });
  });

  it('filters by signup provider', () => {
    const matches = filterWith({ providerFilter: 'google' });
    expect(matches(makeUser({ app_metadata: { provider: 'google' } }), undefined, undefined)).toBe(
      true
    );
    expect(matches(makeUser({ app_metadata: { provider: 'email' } }), undefined, undefined)).toBe(
      false
    );
  });

  describe('search', () => {
    it('matches username or email case-insensitively after trimming', () => {
      const matches = filterWith({ usernameFilter: '  ALI ' });
      expect(matches(makeUser(), makeProfile({ username: 'Alice' }), undefined)).toBe(true);
      expect(
        matches(
          makeUser({ email: 'ALIen@example.com' }),
          makeProfile({ username: 'bob' }),
          undefined
        )
      ).toBe(true);
      expect(
        matches(makeUser({ email: 'bob@example.com' }), makeProfile({ username: 'bob' }), undefined)
      ).toBe(false);
    });

    it('lets an anonymous user match by email', () => {
      const matches = filterWith({ usernameFilter: 'anon' });
      expect(matches(makeUser({ email: 'anon@example.com' }), undefined, undefined)).toBe(true);
    });
  });
});
