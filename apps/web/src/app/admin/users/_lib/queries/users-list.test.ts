import { describe, expect, it, vi } from 'vitest';

import {
  JP_US_JP_PROFILES,
  STANDARD_RANK_ROWS,
  THREE_USERS,
  createMockAdminClient,
  makeUser,
  mockAdminUsersDb,
  mockDrizzleOrm,
  mockProfilesSelect,
  mockSubscriptionConstants,
  setupFilterMock,
} from '../__test-helpers__/admin-users-mocks';
import { EMPTY_ADMIN_USER_FILTERS } from '../filters';

/**
 * Tests for `fetchUsersPageData`: the paginated list, its `totalCount`, and
 * the switch between the direct `listUsers` page and the in-memory filtered
 * population.
 *
 * Since fetchUsersPageData depends on Supabase admin client and Drizzle DB,
 * we mock those dependencies and verify the page data is correctly returned.
 * The filter semantics themselves (country / rank / search / combined) are
 * exercised end-to-end in `users-list-filters.test.ts`.
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
const { fetchUsersPageData } = await import('./users-list');

describe('fetchUsersPageData', () => {
  it('should return totalCount in the result when no status filter is applied', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
    ];

    const mockAdminClient = createMockAdminClient(mockUsers, { total: 50 });

    const result = await fetchUsersPageData(mockAdminClient as never, 1, EMPTY_ADMIN_USER_FILTERS);

    expect(result).toHaveProperty('totalCount');
    expect(result.totalCount).toBe(50);
  });

  it('should return totalCount reflecting filtered count when status filter is applied', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'a@example.com' },
      { id: 'user-2', email: 'b@example.com' },
      { id: 'user-3', email: 'c@example.com' },
    ];

    const mockAdminClient = createMockAdminClient(mockUsers, { total: 3 });

    // All users have no profile → they are all "anonymous"
    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      statusFilter: 'anonymous',
    });

    expect(result).toHaveProperty('totalCount');
    expect(result.totalCount).toBe(3);
  });

  it('should return totalCount of 0 when no users match the filter', async () => {
    const mockAdminClient = createMockAdminClient([], { total: 0 });

    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      statusFilter: 'active',
    });

    expect(result).toHaveProperty('totalCount');
    expect(result.totalCount).toBe(0);
  });

  it('should return totalCount of 0 when no status filter and API returns total 0', async () => {
    const mockAdminClient = createMockAdminClient([], { total: 0 });

    const result = await fetchUsersPageData(mockAdminClient as never, 1, EMPTY_ADMIN_USER_FILTERS);

    expect(result.totalCount).toBe(0);
    expect(result.users).toEqual([]);
  });

  it('should default totalCount to 0 when API response lacks total property', async () => {
    const mockAdminClient = {
      auth: {
        admin: {
          // Intentionally omit `total` to exercise the "missing total" code
          // path; the shared `createMockAdminClient` always includes one.
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [] },
            error: null,
          }),
        },
      },
    };

    const result = await fetchUsersPageData(mockAdminClient as never, 1, EMPTY_ADMIN_USER_FILTERS);

    expect(result.totalCount).toBe(0);
  });

  it('should return totalCount reflecting only active users when active filter is applied', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'active@example.com' },
      { id: 'user-2', email: 'banned@example.com' },
      { id: 'user-3', email: 'anon@example.com' },
    ];

    const mockAdminClient = createMockAdminClient(mockUsers, { total: 3 });

    // Mock profiles: user-1 is active, user-2 is banned, user-3 has no profile (anonymous)
    await mockProfilesSelect([
      { id: 'user-1', bannedAt: null, deletedAt: null },
      { id: 'user-2', bannedAt: new Date('2024-01-15'), deletedAt: null },
    ]);

    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      statusFilter: 'active',
    });

    // Only user-1 is active (has profile, not banned, not deleted)
    expect(result.totalCount).toBe(1);
  });

  it('should return totalCount reflecting only banned users when banned filter is applied', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'active@example.com' },
      { id: 'user-2', email: 'banned@example.com' },
    ];

    const mockAdminClient = createMockAdminClient(mockUsers, { total: 2 });

    await mockProfilesSelect([
      { id: 'user-1', bannedAt: null, deletedAt: null },
      { id: 'user-2', bannedAt: new Date('2024-01-15'), deletedAt: null },
    ]);

    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      statusFilter: 'banned',
    });

    // Only user-2 is banned
    expect(result.totalCount).toBe(1);
  });

  it('should return totalCount reflecting only deleted users when deleted filter is applied', async () => {
    const mockUsers = [
      { id: 'user-1', email: 'active@example.com' },
      { id: 'user-2', email: 'deleted@example.com' },
    ];

    const mockAdminClient = createMockAdminClient(mockUsers, { total: 2 });

    await mockProfilesSelect([
      { id: 'user-1', bannedAt: null, deletedAt: null },
      { id: 'user-2', bannedAt: null, deletedAt: new Date('2024-06-01') },
    ]);

    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      statusFilter: 'deleted',
    });

    // Only user-2 is deleted
    expect(result.totalCount).toBe(1);
  });

  it('should return correct pagination and totalCount for last page with fewer items', async () => {
    // Simulate 25 total users, page 2 should have 5 users (DEFAULT_PAGE_SIZE = 20)
    const mockUsers = Array.from({ length: 5 }, (_, i) => ({
      id: `user-${i + 21}`,
      email: `user${i + 21}@example.com`,
    }));
    const mockAdminClient = createMockAdminClient(mockUsers, { total: 25 });

    const result = await fetchUsersPageData(mockAdminClient as never, 2, EMPTY_ADMIN_USER_FILTERS);

    expect(result.totalCount).toBe(25);
    expect(result.users).toHaveLength(5);
    expect(result.currentPage).toBe(2);
    expect(result.totalPages).toBe(2);
  });

  it('should include all required properties in UsersPageData', async () => {
    const mockAdminClient = createMockAdminClient([], { total: 0 });

    const result = await fetchUsersPageData(mockAdminClient as never, 1, EMPTY_ADMIN_USER_FILTERS);

    expect(result).toHaveProperty('users');
    expect(result).toHaveProperty('currentPage');
    expect(result).toHaveProperty('totalPages');
    expect(result).toHaveProperty('totalCount');
    expect(result).toHaveProperty('profileMap');
    expect(result).toHaveProperty('roleMap');
    expect(result).toHaveProperty('subscriptionMap');
    expect(result).toHaveProperty('banReasonMap');
  });
});

describe('fetchUsersPageData — hasFilter branch', () => {
  it('should use in-memory filtering when only country filter is specified (no status)', async () => {
    const mockAdminClient = createMockAdminClient(THREE_USERS);

    await setupFilterMock({
      profileRows: JP_US_JP_PROFILES,
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [],
    });

    // status is '', country is 'JP' → hasFilter is truthy because of countryFilter
    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      countryFilter: 'JP',
    });

    expect(result.totalCount).toBe(2);
    expect(result.users.every((u) => ['user-1', 'user-3'].includes(u.id))).toBe(true);
  });

  it('should use in-memory filtering when only rank filter is specified (no status)', async () => {
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

    // status is '', rank is '5kyu' → hasFilter is truthy because of rankFilter
    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      rankFilter: '5kyu',
    });

    expect(result.totalCount).toBe(1);
    expect(result.users[0]!.id).toBe('user-1');
  });
});

describe('fetchUsersPageData — provider filter', () => {
  it('should return only google users when providerFilter="google"', async () => {
    const mockUsers = [
      makeUser('user-1', { appMetadataProvider: 'google' }),
      makeUser('user-2', { appMetadataProvider: 'email' }),
      makeUser('user-3', { appMetadataProvider: 'apple' }),
    ];
    const mockAdminClient = createMockAdminClient(mockUsers);

    await setupFilterMock({
      profileRows: [
        { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
        { id: 'user-2', country: 'JP', bannedAt: null, deletedAt: null },
        { id: 'user-3', country: 'JP', bannedAt: null, deletedAt: null },
      ],
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [],
    });

    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      providerFilter: 'google',
    });

    expect(result.totalCount).toBe(1);
    expect(result.users.map((u) => u.id)).toEqual(['user-1']);
  });

  it('should return only email users when providerFilter="email"', async () => {
    const mockUsers = [
      makeUser('user-1', { appMetadataProvider: 'google' }),
      makeUser('user-2', { appMetadataProvider: 'email' }),
      makeUser('user-3', { appMetadataProvider: 'email' }),
    ];
    const mockAdminClient = createMockAdminClient(mockUsers);

    await setupFilterMock({
      profileRows: [
        { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
        { id: 'user-2', country: 'JP', bannedAt: null, deletedAt: null },
        { id: 'user-3', country: 'JP', bannedAt: null, deletedAt: null },
      ],
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [],
    });

    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      providerFilter: 'email',
    });

    expect(result.totalCount).toBe(2);
    expect(result.users.map((u) => u.id).sort()).toEqual(['user-2', 'user-3']);
  });

  it('should return only unknown users when providerFilter="unknown"', async () => {
    const mockUsers = [
      makeUser('user-1', { appMetadataProvider: 'google' }),
      makeUser('user-2', { appMetadataProvider: 'apple' }),
      makeUser('user-3', { appMetadataMissing: true, noIdentities: true }),
    ];
    const mockAdminClient = createMockAdminClient(mockUsers);

    await setupFilterMock({
      profileRows: [
        { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
        { id: 'user-2', country: 'JP', bannedAt: null, deletedAt: null },
        { id: 'user-3', country: 'JP', bannedAt: null, deletedAt: null },
      ],
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [],
    });

    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      providerFilter: 'unknown',
    });

    expect(result.totalCount).toBe(2);
    expect(result.users.map((u) => u.id).sort()).toEqual(['user-2', 'user-3']);
  });

  it('should apply no provider filter when providerFilter is empty string', async () => {
    const mockUsers = [
      makeUser('user-1', { appMetadataProvider: 'google' }),
      makeUser('user-2', { appMetadataProvider: 'email' }),
      makeUser('user-3', { appMetadataProvider: 'apple' }),
    ];
    const mockAdminClient = createMockAdminClient(mockUsers);

    // No filter at all → takes the non-filtered branch of fetchUsersPageData,
    // which reads total from the Supabase response.
    const result = await fetchUsersPageData(mockAdminClient as never, 1, EMPTY_ADMIN_USER_FILTERS);

    expect(result.totalCount).toBe(3);
    expect(result.users).toHaveLength(3);
  });

  it('should combine provider and status filters with AND semantics', async () => {
    const mockUsers = [
      makeUser('user-1', { appMetadataProvider: 'google' }), // active + google
      makeUser('user-2', { appMetadataProvider: 'google' }), // banned + google → excluded
      makeUser('user-3', { appMetadataProvider: 'email' }), // active + email → excluded
    ];
    const mockAdminClient = createMockAdminClient(mockUsers);

    await setupFilterMock({
      profileRows: [
        { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
        { id: 'user-2', country: 'JP', bannedAt: new Date('2024-01-15'), deletedAt: null },
        { id: 'user-3', country: 'JP', bannedAt: null, deletedAt: null },
      ],
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [],
    });

    const result = await fetchUsersPageData(mockAdminClient as never, 1, {
      ...EMPTY_ADMIN_USER_FILTERS,
      statusFilter: 'active',
      providerFilter: 'google',
    });

    expect(result.totalCount).toBe(1);
    expect(result.users.map((u) => u.id)).toEqual(['user-1']);
  });
});
