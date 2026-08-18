import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';

const mockValues = vi.fn().mockReturnValue(Promise.resolve());
const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

vi.mock('@/lib/csrf', () => ({
  isValidOrigin: () => true,
}));

vi.mock('@/lib/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
  },
  userActivityLog: 'userActivityLog',
}));

vi.mock('@/lib/supabase/server');

// Dynamic import so the `vi.mock` calls above are hoisted ahead of the
// route module's transitive imports (it pulls `@/lib/ads/ads-hidden-cookie`
// which references `@/config` — harmless but keeps the pattern uniform).
const { POST } = await import('./route');

const mockUserId = 'user-00000000-0000-0000-0000-000000000001';

function createLogoutRequest(): Request {
  return new Request('https://example.com/auth/logout', {
    method: 'POST',
    headers: { origin: 'https://example.com' },
  });
}

describe('POST /auth/logout', () => {
  beforeEach(() => {
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue(Promise.resolve());
  });

  it('should await db insert and return ok when user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: mockUserId } } });

    const response = await POST(createLogoutRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockInsert).toHaveBeenCalledWith('userActivityLog');
    expect(mockValues).toHaveBeenCalledWith({
      userId: mockUserId,
      action: 'logout',
      targetType: null,
      targetId: null,
      metadata: {},
    });
  });

  it('should return 401 and not insert when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await POST(createLogoutRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ ok: false });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('should return ok even when db insert fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: mockUserId } } });
    mockValues.mockRejectedValue(new Error('DB error'));

    const response = await POST(createLogoutRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
  });
});
