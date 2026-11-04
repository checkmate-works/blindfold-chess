import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isUserBanned } from '@/lib/moderation/ban';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';

const mockGetUser = vi.fn();
const mockGetUserIdentities = vi.fn();
const mockUnlinkIdentity = vi.fn();
const mockGetAccountLoginState = vi.fn();
const mockEnsureEmailIdentity = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mockGetUser,
      getUserIdentities: mockGetUserIdentities,
      unlinkIdentity: mockUnlinkIdentity,
    },
  }),
}));
vi.mock('@/lib/moderation/ban');
vi.mock('@/lib/security/rate-limit');
vi.mock('@/lib/users/activity-log');
vi.mock('@/lib/sentry/capture-error', () => ({ captureError: vi.fn() }));
vi.mock('@/lib/users/login-methods', () => ({
  getAccountLoginState: (...args: unknown[]) => mockGetAccountLoginState(...args),
  ensureEmailIdentity: (...args: unknown[]) => mockEnsureEmailIdentity(...args),
}));

const { unlinkLoginIdentity } = await import('./unlinkLoginIdentity');

const userId = 'user-00000000-0000-0000-0000-000000000001';
const userEmail = 'me@example.com';
const google = { id: 'id-google', provider: 'google', email: 'a@gmail.com' };
const googleB = { id: 'id-google-b', provider: 'google', email: 'b@gmail.com' };

function serverIdentities(...ids: readonly string[]) {
  return { data: { identities: ids.map((identity_id) => ({ identity_id })) }, error: null };
}

function loginState(overrides: { identities?: (typeof google)[]; hasPassword?: boolean } = {}) {
  return {
    email: userEmail,
    pendingEmail: undefined,
    identities: overrides.identities ?? [google],
    hasPassword: overrides.hasPassword ?? true,
  };
}

describe('unlinkLoginIdentity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId, email: userEmail } } });
    vi.mocked(isUserBanned).mockResolvedValue(false);
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true });
    mockGetAccountLoginState.mockResolvedValue(loginState());
    mockEnsureEmailIdentity.mockResolvedValue(undefined);
    mockGetUserIdentities.mockResolvedValue(serverIdentities(google.id));
    mockUnlinkIdentity.mockResolvedValue({ data: {}, error: null });
  });

  it('stops at the guard for a signed-out, banned or rate-limited caller', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    expect(await unlinkLoginIdentity(google.id)).toEqual({ error: 'signInRequired' });

    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } });
    vi.mocked(isUserBanned).mockResolvedValue(true);
    expect(await unlinkLoginIdentity(google.id)).toEqual({ error: 'banned' });

    vi.mocked(isUserBanned).mockResolvedValue(false);
    vi.mocked(checkRateLimit).mockResolvedValue({ error: 'rateLimited' });
    expect(await unlinkLoginIdentity(google.id)).toEqual({ error: 'rateLimited' });

    expect(mockGetAccountLoginState).not.toHaveBeenCalled();
    expect(mockUnlinkIdentity).not.toHaveBeenCalled();
  });

  it('refuses the only Google when there is no password (no web method would remain)', async () => {
    mockGetAccountLoginState.mockResolvedValue(loginState({ hasPassword: false }));

    expect(await unlinkLoginIdentity(google.id)).toEqual({ error: 'removal:lastWebMethod' });
    expect(mockUnlinkIdentity).not.toHaveBeenCalled();
    expect(logActivityEvent).not.toHaveBeenCalled();
  });

  it('reports notLinked for an identity the account does not have', async () => {
    expect(await unlinkLoginIdentity('id-unknown')).toEqual({ error: 'removal:notLinked' });
  });

  it('gives a password user the email identity first, then unlinks and records it', async () => {
    const result = await unlinkLoginIdentity(google.id);

    expect(result).toEqual({ success: true });
    expect(mockEnsureEmailIdentity).toHaveBeenCalledWith(userId, userEmail, [google]);
    expect(mockUnlinkIdentity).toHaveBeenCalledWith({ identity_id: google.id });
    expect(logActivityEvent).toHaveBeenCalledWith({
      userId,
      action: 'unlink_identity',
      metadata: { provider: 'google' },
    });
  });

  it('does not touch the email identity when another Google remains (re-pointing)', async () => {
    mockGetAccountLoginState.mockResolvedValue(
      loginState({ identities: [google, googleB], hasPassword: false })
    );
    mockGetUserIdentities.mockResolvedValue(serverIdentities(google.id, googleB.id));

    expect(await unlinkLoginIdentity(google.id)).toEqual({ success: true });
    expect(mockEnsureEmailIdentity).not.toHaveBeenCalled();
  });

  it('reports notLinked when the auth server no longer lists the identity', async () => {
    mockGetUserIdentities.mockResolvedValue(serverIdentities());

    expect(await unlinkLoginIdentity(google.id)).toEqual({ error: 'removal:notLinked' });
    expect(mockUnlinkIdentity).not.toHaveBeenCalled();
  });

  it('reports unlinkFailed when the auth server refuses', async () => {
    mockUnlinkIdentity.mockResolvedValue({
      data: null,
      error: { code: 'single_identity_not_deletable' },
    });

    expect(await unlinkLoginIdentity(google.id)).toEqual({ error: 'unlinkFailed' });
    expect(logActivityEvent).not.toHaveBeenCalled();
  });
});
