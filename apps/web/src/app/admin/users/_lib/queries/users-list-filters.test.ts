import { describe, expect, it, vi } from 'vitest';

import {
  JP_US_JP_PROFILES,
  STANDARD_RANK_ROWS,
  THREE_USERS,
  createMockAdminClient,
  mockAdminUsersDb,
  mockDrizzleOrm,
  mockSubscriptionConstants,
  setupFilterMock,
} from '../__test-helpers__/admin-users-mocks';
import { EMPTY_ADMIN_USER_FILTERS } from '../filters';

/**
 * The admin users filters driven end-to-end through `fetchUsersPageData`:
 * every call here goes `getFilteredPopulation` → `createPopulationFilter`
 * over the mocked auth users and `profiles` / `ranks` / `user_ranks` rows,
 * so what is asserted is the page the admin sees for a filter, not the
 * predicate in isolation (that is `population-filter.test.ts`).
 *
 * Kept apart from `users-list.test.ts` only for size; the mocks are the same.
 */

vi.mock('@/lib/db', () => mockAdminUsersDb());
vi.mock('drizzle-orm', () => mockDrizzleOrm());
vi.mock('@/lib/billing/subscription-constants', () => mockSubscriptionConstants());

// Loaded once at module scope rather than inside each `it`: pulling this
// graph costs a few hundred milliseconds, and inside a test body that cost is
// charged to vitest's 5s `testTimeout`, which the first test can cross when
// the suite is competing for CPU. Later tests hit the module cache, so the
// symptom is one flaky test rather than a slow file. The `vi.mock` calls
// above are hoisted over this statement, so the load needs no per-test setup.
const { fetchUsersPageData, fetchRankStats } = await import('./users-list');

describe('fetchUsersPageData — country filter', () => {
  it('should return only users from the specified country', async () => {
    const mockAdminClient = createMockAdminClient(THREE_USERS);

    await setupFilterMock({
      profileRows: JP_US_JP_PROFILES,
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [],
    });

    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      countryFilter: 'JP',
    });

    expect(result.totalCount).toBe(2);
    expect(result.users.every((u) => ['user-1', 'user-3'].includes(u.id))).toBe(true);
  });

  it('should return no users when country filter matches nobody', async () => {
    const mockUsers = [{ id: 'user-1', email: 'a@example.com' }];
    const mockAdminClient = createMockAdminClient(mockUsers);

    await setupFilterMock({
      profileRows: [{ id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null }],
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [],
    });

    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      countryFilter: 'FR',
    });

    expect(result.totalCount).toBe(0);
    expect(result.users).toEqual([]);
  });

  it('should treat users with no profile as country=Unknown when filtering', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
    ];
    const mockAdminClient = createMockAdminClient(mockUsers);

    await setupFilterMock({
      profileRows: [
        // user-1 has a profile, user-2 does not (anonymous)
        { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
      ],
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [],
    });

    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      countryFilter: 'Unknown',
    });

    // user-2 has no profile → country defaults to 'Unknown'
    expect(result.totalCount).toBe(1);
    expect(result.users[0]!.id).toBe('user-2');
  });

  it('should return all users when country filter is empty string', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
    ];
    const mockAdminClient = createMockAdminClient(mockUsers);

    // No filters → direct API path (no fetchFilteredUsers)
    const result = await fetchUsersPageData(mockAdminClient as never, 1, EMPTY_ADMIN_USER_FILTERS);

    expect(result.totalCount).toBe(2);
  });
});

describe('fetchUsersPageData — rank filter', () => {
  it('should return only users with the specified rank', async () => {
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
        { userId: 'user-2', rankId: 2 }, // 4kyu
        { userId: 'user-3', rankId: 1 }, // 5kyu
      ],
    });

    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      rankFilter: '5kyu',
    });

    expect(result.totalCount).toBe(2);
    expect(result.users.map((u) => u.id).sort()).toEqual(['user-1', 'user-3']);
  });

  it('should return only unranked users when rank filter is mukyu', async () => {
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
      ],
    });

    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      rankFilter: 'mukyu',
    });

    // user-2 and user-3 have no rank records → mukyu
    expect(result.totalCount).toBe(2);
    expect(result.users.map((u) => u.id).sort()).toEqual(['user-2', 'user-3']);
  });

  it('should return empty when rank filter matches nobody', async () => {
    const mockUsers = [{ id: 'user-1', email: 'a@example.com' }];
    const mockAdminClient = createMockAdminClient(mockUsers);

    await setupFilterMock({
      profileRows: [{ id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null }],
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [], // no ranks at all
    });

    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      rankFilter: '5kyu',
    });

    expect(result.totalCount).toBe(0);
    expect(result.users).toEqual([]);
  });

  /**
   * The rank buckets must be disjoint: a user holding several ranks belongs
   * to exactly one `?rank=` list — the highest one — so the list agrees with
   * the "Users by Rank" chart bar the admin clicked to get here.
   */
  describe('users holding multiple ranks', () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' }, // 1kyu + 1dan (walked the ladder)
      { id: 'user-2', email: 'b@example.com' }, // 1kyu only
      { id: 'user-3', email: 'c@example.com' }, // 1dan only (skip-grant)
    ];

    async function setupMultiRankMock() {
      await setupFilterMock({
        profileRows: [
          { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
          { id: 'user-2', country: 'JP', bannedAt: null, deletedAt: null },
          { id: 'user-3', country: 'JP', bannedAt: null, deletedAt: null },
        ],
        rankRows: STANDARD_RANK_ROWS,
        userRankRows: [
          { userId: 'user-1', rankId: 5 }, // 1kyu
          { userId: 'user-1', rankId: 6 }, // 1dan
          { userId: 'user-2', rankId: 5 }, // 1kyu
          { userId: 'user-3', rankId: 6 }, // 1dan
        ],
      });
    }

    it('should exclude a 1dan holder from the 1kyu list even when they also hold 1kyu', async () => {
      const mockAdminClient = createMockAdminClient(mockUsers);
      await setupMultiRankMock();

      const result = await fetchUsersPageData(mockAdminClient as never, 1, {
        ...EMPTY_ADMIN_USER_FILTERS,
        rankFilter: '1kyu',
      });

      expect(result.users.map((u) => u.id)).toEqual(['user-2']);
      expect(result.totalCount).toBe(1);
    });

    it('should list every 1dan holder regardless of which lower ranks they hold', async () => {
      const mockAdminClient = createMockAdminClient(mockUsers);
      await setupMultiRankMock();

      const result = await fetchUsersPageData(mockAdminClient as never, 1, {
        ...EMPTY_ADMIN_USER_FILTERS,
        rankFilter: '1dan',
      });

      expect(result.users.map((u) => u.id).sort()).toEqual(['user-1', 'user-3']);
      expect(result.totalCount).toBe(2);
    });

    it('should agree with the rank chart counts for the same population', async () => {
      const mockAdminClient = createMockAdminClient(mockUsers);
      await setupMultiRankMock();

      const stats = await fetchRankStats(mockAdminClient as never, EMPTY_ADMIN_USER_FILTERS);

      for (const slug of ['1kyu', '1dan', 'mukyu']) {
        const list = await fetchUsersPageData(mockAdminClient as never, 1, {
          ...EMPTY_ADMIN_USER_FILTERS,
          rankFilter: slug,
        });
        expect(list.totalCount).toBe(stats.find((s) => s.slug === slug)!.count);
      }
    });
  });
});

describe('fetchUsersPageData — username/email filter', () => {
  it('should match users by partial username (case-insensitive)', async () => {
    const mockAdminClient = createMockAdminClient(THREE_USERS);

    await setupFilterMock({
      profileRows: [
        { id: 'user-1', username: 'Alice', country: 'JP', bannedAt: null, deletedAt: null },
        { id: 'user-2', username: 'bob', country: 'JP', bannedAt: null, deletedAt: null },
        { id: 'user-3', username: 'carol', country: 'JP', bannedAt: null, deletedAt: null },
      ] as never,
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [],
    });

    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      usernameFilter: 'ALI',
    });

    expect(result.totalCount).toBe(1);
    expect(result.users.map((u) => u.id)).toEqual(['user-1']);
  });

  it('should match users by partial email when username does not match', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'alice@example.com' },
      { id: 'user-2', email: 'bob@other.org' },
      { id: 'user-3', email: 'carol@example.com' },
    ];
    const mockAdminClient = createMockAdminClient(mockUsers);

    await setupFilterMock({
      profileRows: [
        { id: 'user-1', username: 'a1', country: 'JP', bannedAt: null, deletedAt: null },
        { id: 'user-2', username: 'b2', country: 'JP', bannedAt: null, deletedAt: null },
        { id: 'user-3', username: 'c3', country: 'JP', bannedAt: null, deletedAt: null },
      ] as never,
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [],
    });

    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      usernameFilter: 'example.com',
    });

    expect(result.totalCount).toBe(2);
    expect(result.users.map((u) => u.id).sort()).toEqual(['user-1', 'user-3']);
  });

  it('should match email case-insensitively', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'Alice@Example.Com' },
      { id: 'user-2', email: 'bob@other.org' },
    ];
    const mockAdminClient = createMockAdminClient(mockUsers);

    await setupFilterMock({
      profileRows: [
        { id: 'user-1', username: 'a1', country: 'JP', bannedAt: null, deletedAt: null },
        { id: 'user-2', username: 'b2', country: 'JP', bannedAt: null, deletedAt: null },
      ] as never,
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [],
    });

    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      usernameFilter: 'ALICE@example',
    });

    expect(result.totalCount).toBe(1);
    expect(result.users[0]!.id).toBe('user-1');
  });

  it('should match anonymous users (no profile) by email', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'anon@example.com' },
      { id: 'user-2', email: 'other@elsewhere.io' },
    ];
    const mockAdminClient = createMockAdminClient(mockUsers);

    await setupFilterMock({
      // No profile rows → both users are anonymous
      profileRows: [],
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [],
    });

    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      usernameFilter: 'anon@',
    });

    expect(result.totalCount).toBe(1);
    expect(result.users[0]!.id).toBe('user-1');
  });

  it('should return no users when neither username nor email match', async () => {
    const mockUsers = [{ id: 'user-1', email: 'alice@example.com' }];
    const mockAdminClient = createMockAdminClient(mockUsers);

    await setupFilterMock({
      profileRows: [
        { id: 'user-1', username: 'alice', country: 'JP', bannedAt: null, deletedAt: null },
      ] as never,
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [],
    });

    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      usernameFilter: 'zzz',
    });

    expect(result.totalCount).toBe(0);
    expect(result.users).toEqual([]);
  });
});

describe('fetchUsersPageData — combined filters (AND)', () => {
  it('should apply status AND country AND rank filters together', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' }, // active, JP, 5kyu
      { id: 'user-2', email: 'b@example.com' }, // active, US, 5kyu
      { id: 'user-3', email: 'c@example.com' }, // banned, JP, 5kyu
      { id: 'user-4', email: 'd@example.com' }, // active, JP, no rank
      { id: 'user-5', email: 'e@example.com' }, // active, JP, 4kyu
    ];
    const mockAdminClient = createMockAdminClient(mockUsers);

    await setupFilterMock({
      profileRows: [
        { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
        { id: 'user-2', country: 'US', bannedAt: null, deletedAt: null },
        { id: 'user-3', country: 'JP', bannedAt: new Date('2024-01-15'), deletedAt: null },
        { id: 'user-4', country: 'JP', bannedAt: null, deletedAt: null },
        { id: 'user-5', country: 'JP', bannedAt: null, deletedAt: null },
      ],
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [
        { userId: 'user-1', rankId: 1 }, // 5kyu
        { userId: 'user-2', rankId: 1 }, // 5kyu
        { userId: 'user-3', rankId: 1 }, // 5kyu
        { userId: 'user-5', rankId: 2 }, // 4kyu
      ],
    });

    // active + JP + 5kyu → only user-1
    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      statusFilter: 'active',
      countryFilter: 'JP',
      rankFilter: '5kyu',
    });

    expect(result.totalCount).toBe(1);
    expect(result.users[0]!.id).toBe('user-1');
  });

  it('should return empty when combined filters exclude all users', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
    ];
    const mockAdminClient = createMockAdminClient(mockUsers);

    await setupFilterMock({
      profileRows: [
        { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
        { id: 'user-2', country: 'US', bannedAt: null, deletedAt: null },
      ],
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [
        { userId: 'user-1', rankId: 1 }, // 5kyu
      ],
    });

    // active + US + 5kyu → user-2 is US but has no 5kyu; user-1 is JP
    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      statusFilter: 'active',
      countryFilter: 'US',
      rankFilter: '5kyu',
    });

    expect(result.totalCount).toBe(0);
    expect(result.users).toEqual([]);
  });

  it('should return mukyu users from a specific country', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' }, // JP, 5kyu
      { id: 'user-2', email: 'b@example.com' }, // JP, no rank
      { id: 'user-3', email: 'c@example.com' }, // US, no rank
    ];
    const mockAdminClient = createMockAdminClient(mockUsers);

    await setupFilterMock({
      profileRows: [
        { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
        { id: 'user-2', country: 'JP', bannedAt: null, deletedAt: null },
        { id: 'user-3', country: 'US', bannedAt: null, deletedAt: null },
      ],
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [
        { userId: 'user-1', rankId: 1 }, // 5kyu
      ],
    });

    // JP + mukyu → only user-2
    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      countryFilter: 'JP',
      rankFilter: 'mukyu',
    });

    expect(result.totalCount).toBe(1);
    expect(result.users[0]!.id).toBe('user-2');
  });
});
