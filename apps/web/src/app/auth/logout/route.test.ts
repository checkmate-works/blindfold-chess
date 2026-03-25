import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logActivityEvent } from '@/lib/activity-log';

import { POST } from './route';

const mockGetUser = vi.fn();

vi.mock('@/lib/activity-log', () => ({
  logActivityEvent: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    }),
}));

const mockUserId = 'user-00000000-0000-0000-0000-000000000001';

describe('POST /auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log logout activity event and return ok when user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: mockUserId } } });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(logActivityEvent).toHaveBeenCalledWith({
      userId: mockUserId,
      action: 'logout',
    });
  });

  it('should return 401 and not log when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ ok: false });
    expect(logActivityEvent).not.toHaveBeenCalled();
  });
});
