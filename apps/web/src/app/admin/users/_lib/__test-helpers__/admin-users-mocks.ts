import { vi } from 'vitest';

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

/**
 * Configure the (already-mocked) `db.select` chain to dispatch by table
 * reference, returning the supplied row sets for ranks / user_ranks /
 * profiles. Used by the country / rank / signup-method filter tests so
 * they can declare the underlying data without re-implementing the
 * thenable chain in each test body.
 *
 * Assumes `vi.mock('@/lib/db', ...)` has already replaced `db.select`
 * with a `vi.fn()` — see the top of `queries.test.ts`. We import
 * `@/lib/db` *inside* this function so the test file's hoisted
 * `vi.mock` factory wins over a static module-load-time import.
 */
export async function setupFilterMock(options: {
  profileRows: Array<{
    id: string;
    country?: string | null;
    bannedAt: Date | null;
    deletedAt: Date | null;
  }>;
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
