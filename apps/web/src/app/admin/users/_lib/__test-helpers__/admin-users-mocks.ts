import type { User } from '@supabase/supabase-js';
import { vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

/**
 * Stable rank master rows for tests that need the full belt sequence.
 * Re-export so tests can pass `rankRows: STANDARD_RANK_ROWS` without
 * re-declaring the array per file.
 */
export const STANDARD_RANK_ROWS = [
  { id: 1, slug: '5kyu' },
  { id: 2, slug: '4kyu' },
  { id: 3, slug: '3kyu' },
  { id: 4, slug: '2kyu' },
  { id: 5, slug: '1kyu' },
  { id: 6, slug: '1dan' },
];

/** Three auth users with nothing but an id and an email — the page most filter tests paginate over. */
export const THREE_USERS = [
  { id: 'user-1', email: 'a@example.com' },
  { id: 'user-2', email: 'b@example.com' },
  { id: 'user-3', email: 'c@example.com' },
];

/** The profiles behind {@link THREE_USERS} for the country filter: two in JP, one in US, none banned. */
export const JP_US_JP_PROFILES = [
  { id: 'user-1', country: 'JP', bannedAt: null, deletedAt: null },
  { id: 'user-2', country: 'US', bannedAt: null, deletedAt: null },
  { id: 'user-3', country: 'JP', bannedAt: null, deletedAt: null },
];

/**
 * Module factories for the three `vi.mock` calls every test of the
 * `users-list.ts` queries (`fetchUsersPageData` and the `fetch*Stats`
 * wrappers) needs. `vi.mock` itself has to be called in the test file —
 * vitest hoists it per file — so each file carries
 *
 * ```ts
 * vi.mock('@/lib/db', () => mockAdminUsersDb());
 * vi.mock('drizzle-orm', () => mockDrizzleOrm());
 * vi.mock('@/lib/billing/subscription-constants', () => mockSubscriptionConstants());
 * ```
 *
 * (arrow-wrapped: `vi.mock` is hoisted above the imports, so a bare
 * reference to these functions would be read before the import binding
 * exists) and then loads the subject with `await import('./users-list')`,
 * which runs after the mocks are registered.
 *
 * The db double is a builder that supports method chaining (including
 * `orderBy`) and resolves every query to an empty row set; tests that need
 * rows reconfigure `db.select` through {@link setupFilterMock} or
 * {@link mockProfilesSelect}. A few table objects are replaced with string
 * stubs on top of the real schema so the mocked `drizzle-orm` operators
 * (which just echo their arguments) see stable column references.
 */
export async function mockAdminUsersDb() {
  const mockResult: unknown[] = [];
  const mockWhereResult = {
    orderBy: vi.fn().mockResolvedValue(mockResult),
    [Symbol.iterator]: function* () {
      yield* mockResult;
    },
    then: (resolve: (val: unknown[]) => void) => Promise.resolve(mockResult).then(resolve),
  };

  return {
    ...(await actualDbSchema()),
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(mockWhereResult),
        }),
      }),
    },
    profiles: { id: 'id', $inferSelect: {} },
    userRoles: { userId: 'userId', role: 'role' },
    subscriptions: { userId: 'userId', status: 'status' },
    moderationActions: {
      targetId: 'targetId',
      reason: 'reason',
      createdAt: 'createdAt',
      action: 'action',
      targetType: 'targetType',
    },
    ranks: { id: 'id', slug: 'slug' },
    userRanks: { userId: 'userId', rankId: 'rankId' },
  };
}

/** See {@link mockAdminUsersDb}. */
export function mockDrizzleOrm() {
  return {
    and: (...args: unknown[]) => args,
    desc: (col: unknown) => col,
    eq: (a: unknown, b: unknown) => [a, b],
    inArray: (col: unknown, vals: unknown) => [col, vals],
  };
}

/** See {@link mockAdminUsersDb}. */
export function mockSubscriptionConstants() {
  return { BENEFIT_ACTIVE_STATUSES: ['active'] };
}

type MockUserShape = Record<string, unknown> & { id: string };

/**
 * Build the minimal Supabase admin client shape that
 * `fetchUsersPageData` / stat queries actually consume — only
 * `auth.admin.listUsers`. The default `total` mirrors `users.length`,
 * which matches Supabase's behavior when no filtering is in play; pass
 * an explicit `total` for tests that exercise the
 * "API reports a different total than the page slice" branch.
 */
export function createMockAdminClient(users: MockUserShape[] = [], options?: { total?: number }) {
  return {
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({
          data: { users, total: options?.total ?? users.length },
          error: null,
        }),
      },
    },
  };
}

/**
 * Build a Supabase-like User object with the metadata fields that
 * `getSignupMethod` reads. Most callers only need `id` and a single
 * provider knob; the rest of the options model the edge cases the test
 * suite exercises (missing metadata, identity-only fallback, etc.).
 */
export function makeUser(
  id: string,
  opts: {
    appMetadataProvider?: string | null | undefined;
    appMetadataMissing?: boolean;
    appMetadataNull?: boolean;
    identityProviders?: Array<string | undefined>;
    noIdentities?: boolean;
  } = {}
): MockUserShape {
  const user: MockUserShape = { id, email: `${id}@example.com` };

  if (opts.appMetadataNull) {
    user.app_metadata = null;
  } else if (opts.appMetadataMissing) {
    // leave app_metadata undefined
  } else {
    user.app_metadata =
      opts.appMetadataProvider === undefined ? {} : { provider: opts.appMetadataProvider };
  }

  if (!opts.noIdentities && opts.identityProviders) {
    user.identities = opts.identityProviders.map((p) => ({ provider: p }));
  }

  return user;
}

/** The `profiles` columns the admin user queries read back. */
export type AdminProfileRow = {
  id: string;
  country?: string | null;
  bannedAt: Date | null;
  deletedAt: Date | null;
};

/**
 * Configure the (already-mocked) `db.select` chain to dispatch by table
 * reference, returning the supplied row sets for ranks / user_ranks /
 * profiles. Used by the country / rank / signup-method filter tests and by
 * `fetchRankStats` so they can declare the underlying data without
 * re-implementing the thenable chain in each test body.
 *
 * Dispatching by table rather than by call order is what lets one helper
 * serve both. `fetchRankStats` reads profiles (through `fetchFilteredUsers`),
 * then ranks, then user_ranks — but skips the first and third when the filter
 * matches nobody, so the sequence is not fixed. Each of the three branches
 * also has to answer whether it is awaited directly or through `.where()`:
 * the ranks query takes every row and has no `.where()` at all.
 *
 * Assumes `vi.mock('@/lib/db', ...)` has already replaced `db.select`
 * with a `vi.fn()` — see {@link mockAdminUsersDb}. We import
 * `@/lib/db` *inside* this function so the test file's hoisted
 * `vi.mock` factory wins over a static module-load-time import.
 */
export async function setupFilterMock(options: {
  profileRows: AdminProfileRow[];
  rankRows: Array<{ id: number; slug: string }>;
  userRankRows: Array<{ userId: string; rankId: number }>;
}) {
  const { db, ranks, userRanks } = await import('@/lib/db');
  const mockSelect = db.select as ReturnType<typeof vi.fn>;

  mockSelect.mockImplementation(() => ({
    from: vi.fn().mockImplementation((table: unknown) => {
      if (table === ranks) {
        return {
          where: vi.fn().mockReturnValue({
            then: (resolve: (val: unknown[]) => void, reject?: (err: unknown) => void) =>
              Promise.resolve(options.rankRows).then(resolve, reject),
          }),
          then: (resolve: (val: unknown[]) => void, reject?: (err: unknown) => void) =>
            Promise.resolve(options.rankRows).then(resolve, reject),
        };
      } else if (table === userRanks) {
        return {
          where: vi.fn().mockReturnValue({
            then: (resolve: (val: unknown[]) => void, reject?: (err: unknown) => void) =>
              Promise.resolve(options.userRankRows).then(resolve, reject),
          }),
        };
      } else {
        return {
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
            then: (resolve: (val: unknown[]) => void, reject?: (err: unknown) => void) =>
              Promise.resolve(options.profileRows).then(resolve, reject),
          }),
        };
      }
    }),
  }));
}

/**
 * Point the (already-mocked) `db.select` at one set of profile rows, for the
 * queries that read `profiles` and nothing else.
 *
 * The chain answers two ways because its two callers consume it differently:
 * `.orderBy()` for the paginated list, and awaiting `where()` directly for the
 * count. Twelve tests had written both arms out to vary nothing but the rows.
 *
 * Same precondition as {@link setupFilterMock}: `vi.mock('@/lib/db', ...)` has
 * already replaced `db.select`, and `@/lib/db` is imported inside so the test
 * file's hoisted factory wins.
 */
export async function mockProfilesSelect(profileRows: AdminProfileRow[]) {
  const { db } = await import('@/lib/db');
  const mockSelect = db.select as ReturnType<typeof vi.fn>;

  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue([]),
        then: (resolve: (val: unknown[]) => void) => Promise.resolve(profileRows).then(resolve),
      }),
    }),
  });
}

/**
 * A Supabase Auth `User` carrying only what the stat aggregations read: an
 * `id` and the metadata objects, with the remaining required fields blanked.
 *
 * Distinct from {@link makeUser} above, which builds the loose `listUsers`
 * payload shape for the mocked admin client; this one is for the pure
 * aggregation functions that take `User[]` directly.
 */
export function makeAuthUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    app_metadata: {},
    user_metadata: {},
    aud: '',
    created_at: '',
    ...overrides,
  } as User;
}
