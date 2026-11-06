import { describe, expect, it, vi } from 'vitest';

import type { Profile } from '@/lib/db/schema';

import {
  JP_US_JP_PROFILES,
  STANDARD_RANK_ROWS,
  THREE_USERS,
  createMockAdminClient,
  makeAuthUser,
  mockAdminUsersDb,
  mockDrizzleOrm,
  mockProfilesSelect,
  mockSubscriptionConstants,
  setupFilterMock,
} from '../__test-helpers__/admin-users-mocks';
import { EMPTY_ADMIN_USER_FILTERS } from '../filters';
import { aggregateCountryStats } from './country-stats';

vi.mock('@/lib/db', () => mockAdminUsersDb());
vi.mock('drizzle-orm', () => mockDrizzleOrm());
vi.mock('@/lib/billing/subscription-constants', () => mockSubscriptionConstants());

// Loaded once at module scope rather than inside each `it`: pulling this
// graph costs a few hundred milliseconds, and inside a test body that cost is
// charged to vitest's 5s `testTimeout`, which the first test can cross when
// the suite is competing for CPU. Later tests hit the module cache, so the
// symptom is one flaky test rather than a slow file. The `vi.mock` calls
// above are hoisted over this statement, so the load needs no per-test setup.
const { fetchCountryStats } = await import('./users-list');

function makeProfile(id: string, country: string | null): Profile {
  return { id, country } as Profile;
}

describe('aggregateCountryStats', () => {
  it('returns an empty array for no users', () => {
    expect(aggregateCountryStats([], new Map())).toEqual([]);
  });

  it('counts users per country', () => {
    const users = [makeAuthUser({ id: 'a' }), makeAuthUser({ id: 'b' }), makeAuthUser({ id: 'c' })];
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
    const users = [makeAuthUser({ id: 'a' }), makeAuthUser({ id: 'b' }), makeAuthUser({ id: 'c' })];
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
    const users = Array.from({ length: 5 }, (_, i) => makeAuthUser({ id: String(i) }));
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

describe('fetchCountryStats', () => {
  it('should aggregate country stats without any status filter', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
      { id: 'user-3', email: 'c@example.com' },
    ];

    const mockAdminClient = createMockAdminClient(mockUsers, { total: 3 });

    await mockProfilesSelect([
      { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
      { id: 'user-2', country: 'US', bannedAt: null, deletedAt: null },
      { id: 'user-3', country: 'JP', bannedAt: null, deletedAt: null },
    ]);

    const result = await fetchCountryStats(mockAdminClient as never, EMPTY_ADMIN_USER_FILTERS);

    expect(result).toEqual([
      { country: 'JP', count: 2 },
      { country: 'US', count: 1 },
    ]);
  });

  it('should return results sorted by count in descending order', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
      { id: 'user-3', email: 'c@example.com' },
      { id: 'user-4', email: 'd@example.com' },
      { id: 'user-5', email: 'e@example.com' },
    ];

    const mockAdminClient = createMockAdminClient(mockUsers, { total: 5 });

    await mockProfilesSelect([
      { id: 'user-1', country: 'FR', bannedAt: null, deletedAt: null },
      { id: 'user-2', country: 'US', bannedAt: null, deletedAt: null },
      { id: 'user-3', country: 'US', bannedAt: null, deletedAt: null },
      { id: 'user-4', country: 'US', bannedAt: null, deletedAt: null },
      { id: 'user-5', country: 'FR', bannedAt: null, deletedAt: null },
    ]);

    const result = await fetchCountryStats(mockAdminClient as never, EMPTY_ADMIN_USER_FILTERS);

    expect(result).toEqual([
      { country: 'US', count: 3 },
      { country: 'FR', count: 2 },
    ]);
  });

  it('should group users with null country as Unknown', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
      { id: 'user-3', email: 'c@example.com' },
    ];

    const mockAdminClient = createMockAdminClient(mockUsers, { total: 3 });

    await mockProfilesSelect([
      { id: 'user-1', country: null, bannedAt: null, deletedAt: null },
      { id: 'user-2', country: 'JP', bannedAt: null, deletedAt: null },
      { id: 'user-3', country: null, bannedAt: null, deletedAt: null },
    ]);

    const result = await fetchCountryStats(mockAdminClient as never, EMPTY_ADMIN_USER_FILTERS);

    expect(result).toEqual([
      { country: 'Unknown', count: 2 },
      { country: 'JP', count: 1 },
    ]);
  });

  it('should return empty array when there are no users', async () => {
    const mockAdminClient = createMockAdminClient([], { total: 0 });

    const result = await fetchCountryStats(mockAdminClient as never, EMPTY_ADMIN_USER_FILTERS);

    expect(result).toEqual([]);
  });

  it('should aggregate only active users when active filter is applied', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'active@example.com' },
      { id: 'user-2', email: 'banned@example.com' },
      { id: 'user-3', email: 'active2@example.com' },
    ];

    const mockAdminClient = createMockAdminClient(mockUsers, { total: 3 });

    await mockProfilesSelect([
      { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
      { id: 'user-2', country: 'US', bannedAt: new Date('2024-01-15'), deletedAt: null },
      { id: 'user-3', country: 'JP', bannedAt: null, deletedAt: null },
    ]);

    const result = await fetchCountryStats(mockAdminClient as never, {
      ...EMPTY_ADMIN_USER_FILTERS,
      statusFilter: 'active',
    });

    // Only user-1 and user-3 are active (both JP)
    expect(result).toEqual([{ country: 'JP', count: 2 }]);
  });

  it('should aggregate only banned users when banned filter is applied', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'active@example.com' },
      { id: 'user-2', email: 'banned@example.com' },
      { id: 'user-3', email: 'banned2@example.com' },
    ];

    const mockAdminClient = createMockAdminClient(mockUsers, { total: 3 });

    await mockProfilesSelect([
      { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
      { id: 'user-2', country: 'US', bannedAt: new Date('2024-01-15'), deletedAt: null },
      { id: 'user-3', country: 'FR', bannedAt: new Date('2024-02-01'), deletedAt: null },
    ]);

    const result = await fetchCountryStats(mockAdminClient as never, {
      ...EMPTY_ADMIN_USER_FILTERS,
      statusFilter: 'banned',
    });

    expect(result).toEqual([
      { country: 'US', count: 1 },
      { country: 'FR', count: 1 },
    ]);
  });

  it('should aggregate only anonymous users when anonymous filter is applied', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
      { id: 'user-3', email: 'c@example.com' },
    ];

    const mockAdminClient = createMockAdminClient(mockUsers, { total: 3 });

    await mockProfilesSelect([{ id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null }]);

    const result = await fetchCountryStats(mockAdminClient as never, {
      ...EMPTY_ADMIN_USER_FILTERS,
      statusFilter: 'anonymous',
    });

    // user-2 and user-3 have no profile → anonymous, and no profile means no country → Unknown
    expect(result).toEqual([{ country: 'Unknown', count: 2 }]);
  });

  it('should aggregate only deleted users when deleted filter is applied', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
    ];

    const mockAdminClient = createMockAdminClient(mockUsers, { total: 2 });

    await mockProfilesSelect([
      { id: 'user-1', country: 'US', bannedAt: null, deletedAt: null },
      { id: 'user-2', country: 'JP', bannedAt: null, deletedAt: new Date('2024-06-01') },
    ]);

    const result = await fetchCountryStats(mockAdminClient as never, {
      ...EMPTY_ADMIN_USER_FILTERS,
      statusFilter: 'deleted',
    });

    // Only user-2 is deleted
    expect(result).toEqual([{ country: 'JP', count: 1 }]);
  });

  it('should return single entry when all users are from the same country', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
      { id: 'user-3', email: 'c@example.com' },
    ];

    const mockAdminClient = createMockAdminClient(mockUsers, { total: 3 });

    await mockProfilesSelect([
      { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
      { id: 'user-2', country: 'JP', bannedAt: null, deletedAt: null },
      { id: 'user-3', country: 'JP', bannedAt: null, deletedAt: null },
    ]);

    const result = await fetchCountryStats(mockAdminClient as never, EMPTY_ADMIN_USER_FILTERS);

    expect(result).toEqual([{ country: 'JP', count: 3 }]);
  });

  it('should return single Unknown entry when all users have null country', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
    ];

    const mockAdminClient = createMockAdminClient(mockUsers, { total: 2 });

    await mockProfilesSelect([
      { id: 'user-1', country: null, bannedAt: null, deletedAt: null },
      { id: 'user-2', country: null, bannedAt: null, deletedAt: null },
    ]);

    const result = await fetchCountryStats(mockAdminClient as never, EMPTY_ADMIN_USER_FILTERS);

    expect(result).toEqual([{ country: 'Unknown', count: 2 }]);
  });
});

describe('fetchCountryStats — with country/rank filters', () => {
  it('should pass country filter to fetchFilteredUsers and return stats accordingly', async () => {
    const mockAdminClient = createMockAdminClient(THREE_USERS);

    await setupFilterMock({
      profileRows: JP_US_JP_PROFILES,
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [],
    });

    // Filter by country=JP → only JP users included
    const result = await fetchCountryStats(mockAdminClient as never, {
      ...EMPTY_ADMIN_USER_FILTERS,
      countryFilter: 'JP',
    });

    expect(result).toEqual([{ country: 'JP', count: 2 }]);
  });

  it('should pass rank filter to fetchFilteredUsers and return country stats for ranked users', async () => {
    const mockAdminClient = createMockAdminClient(THREE_USERS);

    await setupFilterMock({
      profileRows: [
        { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
        { id: 'user-2', country: 'US', bannedAt: null, deletedAt: null },
        { id: 'user-3', country: 'JP', bannedAt: null, deletedAt: null },
      ],
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [
        { userId: 'user-1', rankId: 1 }, // 5kyu
        { userId: 'user-3', rankId: 1 }, // 5kyu
      ],
    });

    // Filter by rank=5kyu → user-1 (JP) and user-3 (JP)
    const result = await fetchCountryStats(mockAdminClient as never, {
      ...EMPTY_ADMIN_USER_FILTERS,
      rankFilter: '5kyu',
    });

    expect(result).toEqual([{ country: 'JP', count: 2 }]);
  });
});
