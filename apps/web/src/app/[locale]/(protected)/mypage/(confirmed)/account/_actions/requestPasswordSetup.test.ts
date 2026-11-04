import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isUserBanned } from '@/lib/moderation/ban';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';

const mockGetUser = vi.fn();
const mockResetPasswordForEmail = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser, resetPasswordForEmail: mockResetPasswordForEmail },
  }),
}));
vi.mock('@/lib/moderation/ban');
vi.mock('@/lib/security/rate-limit');
vi.mock('@/lib/users/activity-log');
vi.mock('@/lib/sentry/capture-error', () => ({ captureError: vi.fn() }));
vi.mock('@/config', () => ({ SITE_URL: 'http://localhost:3000' }));

const { requestPasswordSetup } = await import('./requestPasswordSetup');

const userId = 'user-00000000-0000-0000-0000-000000000001';

describe('requestPasswordSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId, email: 'me@example.com' } } });
    vi.mocked(isUserBanned).mockResolvedValue(false);
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true });
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  });

  it('stops at the guard when rate limited', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ error: 'rateLimited' });
    expect(await requestPasswordSetup()).toEqual({ error: 'rateLimited' });
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('refuses an account without an email address', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } });
    expect(await requestPasswordSetup()).toEqual({ error: 'noEmail' });
  });

  it('sends the recovery email to the signed-in address and returns it', async () => {
    expect(await requestPasswordSetup()).toEqual({ success: true, email: 'me@example.com' });
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('me@example.com', {
      redirectTo: 'http://localhost:3000/auth/callback?type=recovery',
    });
    expect(logActivityEvent).toHaveBeenCalledWith({ userId, action: 'request_password_setup' });
  });

  it('maps the auth server send limit to rateLimited and anything else to sendFailed', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ data: null, error: { status: 429 } });
    expect(await requestPasswordSetup()).toEqual({ error: 'rateLimited' });

    mockResetPasswordForEmail.mockResolvedValue({ data: null, error: { code: 'smtp_down' } });
    expect(await requestPasswordSetup()).toEqual({ error: 'sendFailed' });
    expect(logActivityEvent).not.toHaveBeenCalled();
  });
});
