import { getUserMock } from '../__mocks__/server';

/**
 * A Supabase server client with a storage bucket wired in, for the handful of
 * tests the bare `__mocks__/server` cannot serve.
 *
 * That mock covers `auth.getUser` and nothing else, which is right for the
 * forty-odd suites that only need to say who is signed in. The three that also
 * touch Storage had each rebuilt the whole client around their own `getUser`
 * spy, so the half they had in common with everyone else was the half they
 * rewrote.
 *
 * `bucket` returns whatever `storage.from(...)` should answer with — list only
 * the methods the subject calls, so a test fails loudly if it starts calling
 * another one instead of reading `undefined` off an over-complete stub. Auth
 * is driven through the shared {@link getUserMock}, the same handle every
 * other suite uses.
 *
 * ```ts
 * import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';
 * vi.mock('@/lib/supabase/server', () => storageClientMock(() => ({ remove: mockRemove })));
 * ```
 *
 * A thunk, not an object, because the spies it names are declared below the
 * `vi.mock` call that hoists above them. A route imported at the top of the
 * test file pulls `@/lib/supabase/server` in during module evaluation, which
 * runs the factory there and then; reading the spies only when `from()` is
 * called moves that past the temporal dead zone.
 */
export function storageClientMock(bucket: () => Record<string, unknown>) {
  return {
    createClient: () =>
      Promise.resolve({
        auth: { getUser: getUserMock },
        storage: { from: () => bucket() },
      }),
  };
}
