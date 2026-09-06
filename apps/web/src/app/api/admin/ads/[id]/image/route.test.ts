import { beforeEach, describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';

import { DELETE, POST } from './route';

/**
 * The mutation prelude both handlers run before touching a creative: origin
 * check, admin check, and — on POST only — the per-admin upload budget.
 *
 * Everything past it (Sharp, Storage, the payload rewrite) is covered by the
 * modules it delegates to; what has no coverage of its own is the order and
 * the response codes, which is what a caller sees when it is rejected. The
 * asymmetry these pin down is deliberate and easy to "tidy" away: DELETE is
 * not rate limited, and the origin check runs before authentication so a
 * cross-site request is refused without a database round trip.
 *
 * `uploadAdImage` is its own budget, not `uploadArticleImage` — the two admin
 * upload endpoints deliberately do not drain each other's counter.
 */

const mockIsValidOrigin = vi.fn(() => true);
const mockUserRoleRows = vi.fn<() => unknown[]>(() => [{ role: 'admin' }]);
const mockCreativeRows = vi.fn<() => unknown[]>(() => []);

vi.mock('@/lib/csrf', () => ({
  isValidOrigin: () => mockIsValidOrigin(),
}));

vi.mock('@/lib/supabase/server');

vi.mock('@/lib/security/rate-limit');

vi.mock('@/lib/db', async () => {
  const schema = await actualDbSchema();
  return {
    ...schema,
    db: {
      select: () => ({
        from: (table: unknown) => ({
          where: () => ({
            limit: () => (table === schema.userRoles ? mockUserRoleRows() : mockCreativeRows()),
          }),
        }),
      }),
    },
  };
});

// Never reached by these tests — the requests are rejected, or stop at the
// creative lookup — but the route imports it at module load.
vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    rotate: vi.fn().mockReturnThis(),
    resize: vi.fn().mockReturnThis(),
    toBuffer: vi.fn(),
  })),
}));

const adminUserId = 'admin-00000000-0000-0000-0000-000000000001';
const creativeId = 'creative-00000000-0000-0000-0000-000000000001';
const params = Promise.resolve({ id: creativeId });

function request(method: 'POST' | 'DELETE', search = ''): Request {
  return new Request(`https://example.com/api/admin/ads/${creativeId}/image${search}`, { method });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsValidOrigin.mockReturnValue(true);
  mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
  mockUserRoleRows.mockReturnValue([{ role: 'admin' }]);
  mockCreativeRows.mockReturnValue([]);
  // `clearAllMocks` drops recorded calls but keeps an implementation a test
  // installed, so the limiter's default verdict has to be restored by hand.
  vi.mocked(checkRateLimit).mockResolvedValue({ success: true });
});

describe.each([
  { name: 'POST', handler: POST, makeRequest: () => request('POST') },
  { name: 'DELETE', handler: DELETE, makeRequest: () => request('DELETE', '?target=avatar') },
])('$name mutation prelude', ({ handler, makeRequest }) => {
  it('rejects a request from another origin without consulting the database', async () => {
    mockIsValidOrigin.mockReturnValue(false);

    const response = await handler(makeRequest(), { params });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'forbidden' });
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('rejects a signed-out caller as unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await handler(makeRequest(), { params });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'unauthorized' });
  });

  it('rejects a signed-in non-admin as unauthorized', async () => {
    mockUserRoleRows.mockReturnValue([{ role: 'user' }]);

    const response = await handler(makeRequest(), { params });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'unauthorized' });
  });
});

describe('POST', () => {
  it('charges the ad-image upload budget against the admin', async () => {
    await POST(request('POST'), { params });

    const { RATE_LIMITS } = await import('@/lib/security/rate-limit');
    expect(checkRateLimit).toHaveBeenCalledWith(adminUserId, RATE_LIMITS.uploadAdImage);
  });

  it('answers 429 once that budget is spent', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ error: 'rateLimited' });

    const response = await POST(request('POST'), { params });

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({ error: 'rateLimited' });
  });

  it('lets an admin within budget through to the creative lookup', async () => {
    const response = await POST(request('POST'), { params });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'not_found' });
  });
});

describe('DELETE', () => {
  it('does not charge the upload budget', async () => {
    await DELETE(request('DELETE', '?target=avatar'), { params });

    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it('lets an admin through to the target parameter', async () => {
    const response = await DELETE(request('DELETE', '?target=banner'), { params });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'invalid_target' });
  });
});
