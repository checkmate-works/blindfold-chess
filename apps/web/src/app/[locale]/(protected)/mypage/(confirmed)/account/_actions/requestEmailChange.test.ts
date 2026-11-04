import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isUserBanned } from '@/lib/moderation/ban';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';

const mockGetUser = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser, updateUser: mockUpdateUser } }),
}));
vi.mock('@/lib/moderation/ban');
vi.mock('@/lib/security/rate-limit');
vi.mock('@/lib/users/activity-log');
vi.mock('@/lib/sentry/capture-error', () => ({ captureError: vi.fn() }));

const { requestEmailChange } = await import('./requestEmailChange');

const userId = 'user-00000000-0000-0000-0000-000000000001';

describe('requestEmailChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId, email: 'Me@Example.com' } } });
    vi.mocked(isUserBanned).mockResolvedValue(false);
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true });
    mockUpdateUser.mockResolvedValue({ data: {}, error: null });
  });

  it('stops at the guard for a signed-out caller', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    expect(await requestEmailChange('new@example.com')).toEqual({ error: 'signInRequired' });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('rejects a malformed address and the current address (case-insensitively)', async () => {
    expect(await requestEmailChange('not-an-email')).toEqual({ error: 'invalidEmail' });
    expect(await requestEmailChange('  ME@example.COM ')).toEqual({ error: 'sameEmail' });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('asks the auth server to start the change with the normalised address and records it', async () => {
    expect(await requestEmailChange('  New@Example.com ')).toEqual({ success: true });
    expect(mockUpdateUser).toHaveBeenCalledWith({ email: 'new@example.com' });
    expect(logActivityEvent).toHaveBeenCalledWith({ userId, action: 'request_email_change' });
  });

  it('folds email_exists and email_address_invalid into one emailUnavailable code', async () => {
    mockUpdateUser.mockResolvedValue({ data: null, error: { code: 'email_exists' } });
    expect(await requestEmailChange('taken@example.com')).toEqual({ error: 'emailUnavailable' });

    mockUpdateUser.mockResolvedValue({ data: null, error: { code: 'email_address_invalid' } });
    expect(await requestEmailChange('x@invalid.test')).toEqual({ error: 'emailUnavailable' });
    expect(logActivityEvent).not.toHaveBeenCalled();
  });

  it('maps the auth server send limit to rateLimited and anything else to sendFailed', async () => {
    mockUpdateUser.mockResolvedValue({ data: null, error: { code: 'over_email_send_rate_limit' } });
    expect(await requestEmailChange('new@example.com')).toEqual({ error: 'rateLimited' });

    mockUpdateUser.mockResolvedValue({ data: null, error: { code: 'unexpected_failure' } });
    expect(await requestEmailChange('new@example.com')).toEqual({ error: 'sendFailed' });
  });
});
