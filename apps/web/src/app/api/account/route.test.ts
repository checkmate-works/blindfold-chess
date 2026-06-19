import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkRateLimit } from '@/lib/security/rate-limit';

import { DELETE } from './route';

const mockGetUser = vi.fn();
const mockIsUserBanned = vi.fn();
const mockDeleteAccount = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/csrf', () => ({
  isValidOrigin: () => true,
}));

vi.mock('@/lib/auth', () => ({
  authenticateAndGuardApi: async (rateLimitConfig: {
    action: string;
    maxAttempts: number;
    windowMs: number;
  }) => {
    const { createClient } = await import('@/lib/supabase/server');
    const { isUserBanned } = await import('@/lib/moderation/ban');
    const { checkRateLimit } = await import('@/lib/security/rate-limit');
    const { NextResponse } = await import('next/server');

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
    }

    if (await isUserBanned(user.id)) {
      return { response: NextResponse.json({ error: 'banned' }, { status: 403 }) };
    }

    const rateLimitResult = await checkRateLimit(user.id, rateLimitConfig);
    if ('error' in rateLimitResult) {
      return { response: NextResponse.json({ error: 'rateLimited' }, { status: 429 }) };
    }

    return { user };
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    }),
}));

vi.mock('@/lib/users/delete-account', () => ({
  deleteAccount: (...args: unknown[]) => mockDeleteAccount(...args),
}));

vi.mock('@/lib/moderation/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  RATE_LIMITS: {
    deleteAccount: { action: 'delete_account', maxAttempts: 3, windowMs: 3_600_000 },
  },
}));

const testUserId = 'user-id-00000000-0000-0000-0000-000000000001';

function createDeleteRequest(): Request {
  return new Request('https://example.com/api/account', {
    method: 'DELETE',
    headers: { origin: 'https://example.com' },
  });
}

describe('DELETE /api/account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteAccount.mockResolvedValue({ ok: true });
  });

  describe('ban enforcement', () => {
    it('should return 403 when user is banned', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      });
      mockIsUserBanned.mockResolvedValue(true);

      const response = await DELETE(createDeleteRequest());

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body).toEqual({ error: 'banned' });
      expect(mockDeleteAccount).not.toHaveBeenCalled();
    });
  });

  describe('rate limit enforcement', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      });
      mockIsUserBanned.mockResolvedValue(false);
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ error: 'rateLimited' } as never);

      const response = await DELETE(createDeleteRequest());

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body).toEqual({ error: 'rateLimited' });
      expect(mockDeleteAccount).not.toHaveBeenCalled();
    });
  });

  describe('normal case', () => {
    it('should delegate to deleteAccount and return success for authenticated user', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      });
      mockIsUserBanned.mockResolvedValue(false);

      const response = await DELETE(createDeleteRequest());

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ success: true });

      expect(mockDeleteAccount).toHaveBeenCalledWith(testUserId);
    });
  });

  describe('error cases', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
      });

      const response = await DELETE(createDeleteRequest());

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: 'unauthorized' });

      expect(mockDeleteAccount).not.toHaveBeenCalled();
    });

    it('should return 500 when deleteAccount fails', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: testUserId } },
      });
      mockIsUserBanned.mockResolvedValue(false);
      mockDeleteAccount.mockResolvedValue({ ok: false, error: 'failed_to_delete_auth_user' });

      const response = await DELETE(createDeleteRequest());

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ error: 'failed_to_delete_auth_user' });
    });
  });

  describe('edge cases', () => {
    it('should handle getUser returning an error object', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error('session expired'),
      });

      const response = await DELETE(createDeleteRequest());

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: 'unauthorized' });
    });
  });
});
