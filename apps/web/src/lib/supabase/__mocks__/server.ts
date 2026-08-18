import { vi } from 'vitest';

/**
 * A Supabase server client whose only wired method is `auth.getUser`.
 *
 * Opt in with a bare `vi.mock('@/lib/supabase/server')` and drive it through
 * {@link getUserMock}, which every test aliased as `mockGetUser`:
 *
 * ```ts
 * import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';
 * vi.mock('@/lib/supabase/server');
 * ```
 *
 * Forty-three test files declared the same six-line factory, which cannot be
 * shared as a plain helper because `vi.mock` factories are hoisted above
 * imports. Replacing a module wholesale usually costs strictness — the SUT can
 * start calling another export and nothing notices — but `server.ts` exports
 * `createClient` and nothing else, so there is no other export to miss.
 *
 * The handful of tests that need more of the client (storage, password flows)
 * keep their own inline factory.
 */
export const getUserMock = vi.fn();

export const createClient = vi.fn(async () => ({
  auth: { getUser: getUserMock },
}));
