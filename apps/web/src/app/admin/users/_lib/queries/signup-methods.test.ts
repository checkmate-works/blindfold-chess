import type { User } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import {
  JP_US_JP_PROFILES,
  STANDARD_RANK_ROWS,
  createMockAdminClient,
  makeAuthUser,
  makeUser,
  mockAdminUsersDb,
  mockDrizzleOrm,
  mockSubscriptionConstants,
  setupFilterMock,
} from '../__test-helpers__/admin-users-mocks';
import { EMPTY_ADMIN_USER_FILTERS } from '../filters';
import { aggregateSignupMethodStats, getSignupMethod } from './signup-methods';

vi.mock('@/lib/db', () => mockAdminUsersDb());
vi.mock('drizzle-orm', () => mockDrizzleOrm());
vi.mock('@/lib/billing/subscription-constants', () => mockSubscriptionConstants());

// Loaded once at module scope rather than inside each `it`: pulling this
// graph costs a few hundred milliseconds, and inside a test body that cost is
// charged to vitest's 5s `testTimeout`, which the first test can cross when
// the suite is competing for CPU. Later tests hit the module cache, so the
// symptom is one flaky test rather than a slow file. The `vi.mock` calls
// above are hoisted over this statement, so the load needs no per-test setup.
const { fetchSignupMethodStats } = await import('./users-list');

describe('getSignupMethod', () => {
  it('returns "google" when app_metadata.provider is google', () => {
    const user = makeAuthUser({ app_metadata: { provider: 'google' } });
    expect(getSignupMethod(user)).toBe('google');
  });

  it('returns "email" when app_metadata.provider is email', () => {
    const user = makeAuthUser({ app_metadata: { provider: 'email' } });
    expect(getSignupMethod(user)).toBe('email');
  });

  it('returns "unknown" when app_metadata.provider is missing and no identities', () => {
    const user = makeAuthUser({ app_metadata: {} });
    expect(getSignupMethod(user)).toBe('unknown');
  });

  it('falls back to identities[0].provider when app_metadata.provider is missing', () => {
    const user = makeAuthUser({
      app_metadata: {},
      identities: [{ provider: 'google' }] as User['identities'],
    });
    expect(getSignupMethod(user)).toBe('google');
  });

  it('returns "unknown" for unrecognised providers (e.g., github)', () => {
    const user = makeAuthUser({ app_metadata: { provider: 'github' } });
    expect(getSignupMethod(user)).toBe('unknown');
  });

  it('prefers app_metadata.provider over identities[0].provider', () => {
    const user = makeAuthUser({
      app_metadata: { provider: 'email' },
      identities: [{ provider: 'google' }] as User['identities'],
    });
    expect(getSignupMethod(user)).toBe('email');
  });

  it('should return "google" when app_metadata.provider is "google"', async () => {
    const user = makeUser('u1', { appMetadataProvider: 'google' });
    expect(getSignupMethod(user as never)).toBe('google');
  });

  it('should return "email" when app_metadata.provider is "email"', async () => {
    const user = makeUser('u1', { appMetadataProvider: 'email' });
    expect(getSignupMethod(user as never)).toBe('email');
  });

  it('should return "unknown" for an unrecognized provider like "apple"', async () => {
    const user = makeUser('u1', { appMetadataProvider: 'apple' });
    expect(getSignupMethod(user as never)).toBe('unknown');
  });

  it('should return "unknown" when app_metadata.provider is an empty string', async () => {
    const user = makeUser('u1', { appMetadataProvider: '' });
    expect(getSignupMethod(user as never)).toBe('unknown');
  });

  it('should fall back to identities[0].provider when app_metadata is missing', async () => {
    const user = makeUser('u1', {
      appMetadataMissing: true,
      identityProviders: ['google'],
    });
    expect(getSignupMethod(user as never)).toBe('google');
  });

  it('should fall back to identities[0].provider when app_metadata has no provider key', async () => {
    // app_metadata exists as {} (no provider key) — falls through to identities
    const user = makeUser('u1', {
      appMetadataProvider: undefined,
      identityProviders: ['email'],
    });
    expect(getSignupMethod(user as never)).toBe('email');
  });

  it('should return "unknown" when both app_metadata and identities are missing', async () => {
    const user = makeUser('u1', { appMetadataMissing: true, noIdentities: true });
    expect(getSignupMethod(user as never)).toBe('unknown');
  });

  it('should return "unknown" when identities array is present but empty', async () => {
    const user = makeUser('u1', { appMetadataMissing: true, identityProviders: [] });
    expect(getSignupMethod(user as never)).toBe('unknown');
  });

  it('should return "unknown" defensively when app_metadata is null', async () => {
    const user = makeUser('u1', { appMetadataNull: true, noIdentities: true });
    expect(getSignupMethod(user as never)).toBe('unknown');
  });

  it('should return "unknown" when identities[0].provider is an unrecognized string', async () => {
    const user = makeUser('u1', {
      appMetadataMissing: true,
      identityProviders: ['facebook'],
    });
    expect(getSignupMethod(user as never)).toBe('unknown');
  });

  it('should prefer app_metadata.provider over identities[0].provider when both are set', async () => {
    const user = makeUser('u1', {
      appMetadataProvider: 'google',
      identityProviders: ['email'],
    });
    expect(getSignupMethod(user as never)).toBe('google');
  });
});

describe('aggregateSignupMethodStats', () => {
  it('returns all three buckets in fixed order even when empty', () => {
    expect(aggregateSignupMethodStats([])).toEqual([
      { method: 'google', count: 0 },
      { method: 'email', count: 0 },
      { method: 'unknown', count: 0 },
    ]);
  });

  it('counts users by signup method', () => {
    const users = [
      makeAuthUser({ id: 'a', app_metadata: { provider: 'google' } }),
      makeAuthUser({ id: 'b', app_metadata: { provider: 'google' } }),
      makeAuthUser({ id: 'c', app_metadata: { provider: 'email' } }),
      makeAuthUser({ id: 'd', app_metadata: { provider: 'github' } }),
    ];
    expect(aggregateSignupMethodStats(users)).toEqual([
      { method: 'google', count: 2 },
      { method: 'email', count: 1 },
      { method: 'unknown', count: 1 },
    ]);
  });
});

describe('fetchSignupMethodStats', () => {
  it('should return three buckets in fixed [google, email, unknown] order', async () => {
    const mockUsers = [
      makeUser('user-1', { appMetadataProvider: 'google' }),
      makeUser('user-2', { appMetadataProvider: 'email' }),
    ];
    const mockAdminClient = createMockAdminClient(mockUsers);

    await setupFilterMock({
      profileRows: [
        { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
        { id: 'user-2', country: 'JP', bannedAt: null, deletedAt: null },
      ],
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [],
    });

    const result = await fetchSignupMethodStats(mockAdminClient as never, EMPTY_ADMIN_USER_FILTERS);

    // Fixed order — unknown bucket still present with count 0
    expect(result.map((r) => r.method)).toEqual(['google', 'email', 'unknown']);
    expect(result).toEqual([
      { method: 'google', count: 1 },
      { method: 'email', count: 1 },
      { method: 'unknown', count: 0 },
    ]);
  });

  it('should count a mixed user set correctly', async () => {
    const mockUsers = [
      makeUser('user-1', { appMetadataProvider: 'google' }),
      makeUser('user-2', { appMetadataProvider: 'google' }),
      makeUser('user-3', { appMetadataProvider: 'google' }),
      makeUser('user-4', { appMetadataProvider: 'email' }),
      makeUser('user-5', { appMetadataProvider: 'apple' }), // unknown
      makeUser('user-6', { appMetadataMissing: true, noIdentities: true }), // unknown
    ];
    const mockAdminClient = createMockAdminClient(mockUsers);

    await setupFilterMock({
      profileRows: mockUsers.map((u) => ({
        id: u.id as string,
        country: 'JP',
        bannedAt: null,
        deletedAt: null,
      })),
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [],
    });

    const result = await fetchSignupMethodStats(mockAdminClient as never, EMPTY_ADMIN_USER_FILTERS);

    expect(result).toEqual([
      { method: 'google', count: 3 },
      { method: 'email', count: 1 },
      { method: 'unknown', count: 2 },
    ]);
  });

  it('should reflect the filtered population when statusFilter is applied', async () => {
    const mockUsers = [
      makeUser('user-1', { appMetadataProvider: 'google' }), // active
      makeUser('user-2', { appMetadataProvider: 'google' }), // banned → excluded
      makeUser('user-3', { appMetadataProvider: 'email' }), // active
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

    const result = await fetchSignupMethodStats(mockAdminClient as never, {
      ...EMPTY_ADMIN_USER_FILTERS,
      statusFilter: 'active',
    });

    expect(result).toEqual([
      { method: 'google', count: 1 },
      { method: 'email', count: 1 },
      { method: 'unknown', count: 0 },
    ]);
  });

  it('should reflect the filtered population when countryFilter is applied', async () => {
    const mockUsers = [
      makeUser('user-1', { appMetadataProvider: 'google' }), // JP
      makeUser('user-2', { appMetadataProvider: 'email' }), // US → excluded
      makeUser('user-3', { appMetadataProvider: 'google' }), // JP
    ];
    const mockAdminClient = createMockAdminClient(mockUsers);

    await setupFilterMock({
      profileRows: JP_US_JP_PROFILES,
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [],
    });

    const result = await fetchSignupMethodStats(mockAdminClient as never, {
      ...EMPTY_ADMIN_USER_FILTERS,
      countryFilter: 'JP',
    });

    expect(result).toEqual([
      { method: 'google', count: 2 },
      { method: 'email', count: 0 },
      { method: 'unknown', count: 0 },
    ]);
  });

  it('should reflect the filtered population when rankFilter is applied', async () => {
    const mockUsers = [
      makeUser('user-1', { appMetadataProvider: 'google' }), // 5kyu
      makeUser('user-2', { appMetadataProvider: 'email' }), // mukyu → excluded
      makeUser('user-3', { appMetadataProvider: 'google' }), // 5kyu
    ];
    const mockAdminClient = createMockAdminClient(mockUsers);

    await setupFilterMock({
      profileRows: [
        { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
        { id: 'user-2', country: 'JP', bannedAt: null, deletedAt: null },
        { id: 'user-3', country: 'JP', bannedAt: null, deletedAt: null },
      ],
      rankRows: STANDARD_RANK_ROWS,
      userRankRows: [
        { userId: 'user-1', rankId: 1 }, // 5kyu
        { userId: 'user-3', rankId: 1 }, // 5kyu
      ],
    });

    const result = await fetchSignupMethodStats(mockAdminClient as never, {
      ...EMPTY_ADMIN_USER_FILTERS,
      rankFilter: '5kyu',
    });

    expect(result).toEqual([
      { method: 'google', count: 2 },
      { method: 'email', count: 0 },
      { method: 'unknown', count: 0 },
    ]);
  });

  it('should return all three buckets with count 0 for an empty user set', async () => {
    const mockAdminClient = createMockAdminClient([], { total: 0 });

    const result = await fetchSignupMethodStats(mockAdminClient as never, EMPTY_ADMIN_USER_FILTERS);

    expect(result).toEqual([
      { method: 'google', count: 0 },
      { method: 'email', count: 0 },
      { method: 'unknown', count: 0 },
    ]);
  });
});
