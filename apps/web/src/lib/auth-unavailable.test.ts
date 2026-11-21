import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
} from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';

vi.mock('@/lib/supabase/server');
// `auth.ts` imports these for its guards; none is reached by the calls below.
vi.mock('@/lib/db', () => ({ db: {}, profiles: {} }));
vi.mock('@/lib/moderation/ban', () => ({ isUserBanned: vi.fn() }));
vi.mock('@/lib/security/rate-limit', () => ({ checkRateLimit: vi.fn() }));
vi.mock('@/lib/current-return-target', () => ({ getCurrentReturnTarget: vi.fn() }));
vi.mock('next-intl/server', () => ({ getLocale: vi.fn() }));
// `React.cache` memoises per request; outside one each test needs its own copy.
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  cache: <T>(fn: T) => fn,
}));

const { getOptionalUser, isAuthUnavailable } = await import('./auth');

beforeEach(() => {
  mockGetUser.mockReset();
});

describe('isAuthUnavailable', () => {
  it('is true when the Auth server could not be reached, though the user reads as null', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new AuthRetryableFetchError('fetch failed', 0),
    });

    expect(await getOptionalUser()).toBeNull();
    expect(await isAuthUnavailable()).toBe(true);
  });

  it('is false for a visitor who is simply not signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new AuthSessionMissingError() });

    expect(await isAuthUnavailable()).toBe(false);
  });

  it('is false when the Auth server answered and refused the session', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new AuthApiError('Invalid JWT', 403, 'bad_jwt'),
    });

    expect(await isAuthUnavailable()).toBe(false);
  });

  it('is false for a signed-in user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });

    expect(await isAuthUnavailable()).toBe(false);
  });
});
