import { getExpForLevel } from '@blindfold-chess/features/exp';
import { describe, expect, it } from 'vitest';

import type { Profile } from '@/lib/db/schema';

import { makeAuthUser } from '../__test-helpers__/admin-users-mocks';
import { type AdminUserFilters, EMPTY_ADMIN_USER_FILTERS } from '../filters';
import { UNKNOWN_COUNTRY } from './country-stats';
import { NO_EXP_BUCKET } from './level-stats';
import { createPopulationFilter, groupRankSlugsByUser } from './population-filter';

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
    expect(matches(makeAuthUser(), undefined, undefined)).toBe(true);
    expect(matches(makeAuthUser(), makeProfile({ deletedAt: new Date() }), undefined)).toBe(true);
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
      expect(profiles.map((p) => matches(makeAuthUser(), p, undefined))).toEqual(expected);
    });
  });

  it('buckets users without a country under UNKNOWN_COUNTRY', () => {
    const matches = filterWith({ countryFilter: UNKNOWN_COUNTRY });
    expect(matches(makeAuthUser(), makeProfile({ country: null }), undefined)).toBe(true);
    expect(matches(makeAuthUser(), undefined, undefined)).toBe(true);
    expect(matches(makeAuthUser(), makeProfile({ country: 'JP' }), undefined)).toBe(false);
  });

  describe('rank', () => {
    it('matches a user only at their highest held rank', () => {
      const held = new Set(['1kyu', '1dan']);
      expect(filterWith({ rankFilter: '1dan' })(makeAuthUser(), makeProfile(), held)).toBe(true);
      expect(filterWith({ rankFilter: '1kyu' })(makeAuthUser(), makeProfile(), held)).toBe(false);
    });

    it('treats mukyu as holding no rank at all', () => {
      const matches = filterWith({ rankFilter: 'mukyu' });
      expect(matches(makeAuthUser(), makeProfile(), undefined)).toBe(true);
      expect(matches(makeAuthUser(), makeProfile(), new Set())).toBe(true);
      expect(matches(makeAuthUser(), makeProfile(), new Set(['1kyu']))).toBe(false);
    });

    it('rejects a user with no ranks for a non-mukyu filter', () => {
      expect(filterWith({ rankFilter: '1kyu' })(makeAuthUser(), makeProfile(), undefined)).toBe(
        false
      );
    });
  });

  describe('level', () => {
    it('matches a user only in the band their cumulative Exp resolves to', () => {
      const lv5 = getExpForLevel(5);
      expect(
        filterWith({ levelFilter: '5-9' })(makeAuthUser(), makeProfile(), undefined, lv5)
      ).toBe(true);
      expect(
        filterWith({ levelFilter: '1-4' })(makeAuthUser(), makeProfile(), undefined, lv5)
      ).toBe(false);
    });

    it('treats a missing user_exp row as the no-exp bucket, not Lv0', () => {
      const none = filterWith({ levelFilter: NO_EXP_BUCKET });
      expect(none(makeAuthUser(), makeProfile(), undefined, undefined)).toBe(true);
      expect(none(makeAuthUser(), makeProfile(), undefined, 0)).toBe(false);

      const lv0 = filterWith({ levelFilter: '0' });
      expect(lv0(makeAuthUser(), makeProfile(), undefined, 0)).toBe(true);
      expect(lv0(makeAuthUser(), makeProfile(), undefined, undefined)).toBe(false);
    });
  });

  it('filters by signup provider', () => {
    const matches = filterWith({ providerFilter: 'google' });
    expect(
      matches(makeAuthUser({ app_metadata: { provider: 'google' } }), undefined, undefined)
    ).toBe(true);
    expect(
      matches(makeAuthUser({ app_metadata: { provider: 'email' } }), undefined, undefined)
    ).toBe(false);
  });

  describe('search', () => {
    it('matches username or email case-insensitively after trimming', () => {
      const matches = filterWith({ usernameFilter: '  ALI ' });
      expect(matches(makeAuthUser(), makeProfile({ username: 'Alice' }), undefined)).toBe(true);
      expect(
        matches(
          makeAuthUser({ email: 'ALIen@example.com' }),
          makeProfile({ username: 'bob' }),
          undefined
        )
      ).toBe(true);
      expect(
        matches(
          makeAuthUser({ email: 'bob@example.com' }),
          makeProfile({ username: 'bob' }),
          undefined
        )
      ).toBe(false);
    });

    it('lets an anonymous user match by email', () => {
      const matches = filterWith({ usernameFilter: 'anon' });
      expect(matches(makeAuthUser({ email: 'anon@example.com' }), undefined, undefined)).toBe(true);
    });
  });
});
