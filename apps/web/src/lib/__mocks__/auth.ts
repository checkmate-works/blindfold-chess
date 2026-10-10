import { vi } from 'vitest';

/**
 * The auth guards, stubbed so a test decides who is signed in.
 *
 * Opt in with a bare `vi.mock('@/lib/auth')` and drive the spies through this
 * file's exports (`import { authenticateAndGuard as mockAuthenticateAndGuard }
 * from '@/lib/__mocks__/auth'`), the same way the Supabase and ban mocks are
 * read back.
 *
 * The leaf guards are bare spies with no default: what "signed in" means is
 * the subject of almost every test that mocks this module, so each one sets it.
 * `userHasProfile` alone defaults to `true`, because a provisional user is the
 * exception a test opts into.
 *
 * The two `...RequireProfile` guards are composed rather than stubbed flat,
 * exactly as `auth.ts` composes them: the plain guard first, then the
 * `profiles` lookup. That keeps a test that drives only `authenticateAndGuard`
 * exercising signInRequired / banned / rateLimited through the profile-gated
 * entry point too, and `userHasProfile.mockResolvedValueOnce(false)` yields
 * `profileRequired`. Six suites carried that composition inline, verbatim. A
 * test that wants the composite to answer directly can still override it with
 * `mockResolvedValue`.
 */
export const getOptionalUser = vi.fn();
export const getAuthenticatedUser = vi.fn();
export const authenticateAndCheckBan = vi.fn();
export const authenticateAndGuard = vi.fn();
export const authenticateAndGuardApi = vi.fn();
export const userHasProfile = vi.fn(async (_userId?: string) => true);

export const authenticateCheckBanAndRequireProfile = vi.fn(async () => {
  const guardResult = await authenticateAndCheckBan();
  if ('error' in guardResult) return guardResult;
  return (await userHasProfile(guardResult.user.id)) ? guardResult : { error: 'profileRequired' };
});

export const authenticateGuardAndRequireProfile = vi.fn(async (...args: unknown[]) => {
  const guardResult = await authenticateAndGuard(...args);
  if ('error' in guardResult) return guardResult;
  return (await userHasProfile(guardResult.user.id)) ? guardResult : { error: 'profileRequired' };
});
