import { beforeEach, describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';

import { DELETE, POST } from './route';

/**
 * The mutation prelude both handlers run before touching an article: origin
 * check, admin check, and — on POST only — the per-admin upload budget.
 *
 * Everything past it (Sharp, Storage, the insert) is covered by the modules it
 * delegates to; what has no coverage of its own is the order and the response
 * codes, which is what a caller sees when it is rejected. The asymmetry these
 * pin down is deliberate and easy to "tidy" away: DELETE is not rate limited,
 * and the origin check runs before authentication so a cross-site request is
 * refused without a database round trip.
 */

const mockIsValidOrigin = vi.fn(() => true);
const mockUserRoleRows = vi.fn<() => unknown[]>(() => [{ role: 'admin' }]);
const mockArticleRows = vi.fn<() => unknown[]>(() => []);

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
            limit: () => (table === schema.userRoles ? mockUserRoleRows() : mockArticleRows()),
          }),
        }),
      }),
    },
  };
});

// Never reached by these tests — the requests are rejected, or stop at the
// article lookup — but the route imports it at module load.
vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    rotate: vi.fn().mockReturnThis(),
    resize: vi.fn().mockReturnThis(),
    toBuffer: vi.fn(),
  })),
}));

const adminUserId = 'admin-00000000-0000-0000-0000-000000000001';
const articleId = 'article-00000000-0000-0000-0000-000000000001';
const params = Promise.resolve({ id: articleId });

function request(method: 'POST' | 'DELETE', body?: string): Request {
  return new Request(`https://example.com/api/admin/articles/${articleId}/images`, {
    method,
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsValidOrigin.mockReturnValue(true);
  mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
  mockUserRoleRows.mockReturnValue([{ role: 'admin' }]);
  mockArticleRows.mockReturnValue([]);
  // `clearAllMocks` drops recorded calls but keeps an implementation a test
  // installed, so the limiter's default verdict has to be restored by hand.
  vi.mocked(checkRateLimit).mockResolvedValue({ success: true });
});

describe.each([
  { name: 'POST', handler: POST, makeRequest: () => request('POST') },
  { name: 'DELETE', handler: DELETE, makeRequest: () => request('DELETE', 'not json') },
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
  it('charges the article-image upload budget against the admin', async () => {
    await POST(request('POST'), { params });

    const { RATE_LIMITS } = await import('@/lib/security/rate-limit');
    expect(checkRateLimit).toHaveBeenCalledWith(adminUserId, RATE_LIMITS.uploadArticleImage);
  });

  it('answers 429 once that budget is spent', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ error: 'rateLimited' });

    const response = await POST(request('POST'), { params });

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({ error: 'rateLimited' });
  });

  it('lets an admin within budget through to the article lookup', async () => {
    const response = await POST(request('POST'), { params });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'article_not_found' });
  });
});

describe('DELETE', () => {
  it('does not charge the upload budget', async () => {
    await DELETE(request('DELETE', 'not json'), { params });

    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it('lets an admin through to the request body', async () => {
    const response = await DELETE(request('DELETE', 'not json'), { params });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'invalid_body' });
  });
});
