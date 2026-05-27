import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAdBanner } from './createAdBanner';

const mockGetUser = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockInsertValuesReturning = vi.fn();

const generatedId = 'generated-00000000-0000-0000-0000-000000000001';

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (...args: unknown[]) => {
          mockSelectFromWhere(...args);
          return {
            limit: () =>
              mockSelectFromWhere.mock.results[mockSelectFromWhere.mock.calls.length - 1]?.value ??
              [],
          };
        },
      }),
    }),
    insert: () => ({
      values: (data: unknown) => ({
        returning: () => {
          mockInsertValuesReturning(data);
          return [{ id: generatedId }];
        },
      }),
    }),
  },
  adBanners: { id: 'id' },
  userRoles: { userId: 'user_id' },
}));

const adminUserId = 'admin-00000000-0000-0000-0000-000000000001';

const validData = {
  slot: 'sidebar',
  href: 'https://example.com',
  imagePath: '/banners/test.png',
  alt: 'Test banner',
  width: 300,
  height: 250,
  isActive: true,
  sortOrder: 0,
  startAt: null,
  endAt: null,
};

describe('createAdBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return unauthorized when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await createAdBanner(validData);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return validation error when slot is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAdBanner({ ...validData, slot: '' });
    expect(result).toEqual({ error: 'invalid slot' });
  });

  it('should successfully create banner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAdBanner(validData);

    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockInsertValuesReturning).toHaveBeenCalled();
  });

  it('should reject javascript: href', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAdBanner({ ...validData, href: 'javascript:alert(1)' });
    expect(result).toEqual({ error: 'invalid href' });
    expect(mockInsertValuesReturning).not.toHaveBeenCalled();
  });

  it('should reject data: href', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAdBanner({
      ...validData,
      href: 'data:text/html,<script>alert(1)</script>',
    });
    expect(result).toEqual({ error: 'invalid href' });
    expect(mockInsertValuesReturning).not.toHaveBeenCalled();
  });

  it('should reject unparseable href', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAdBanner({ ...validData, href: 'not a url' });
    expect(result).toEqual({ error: 'invalid href' });
    expect(mockInsertValuesReturning).not.toHaveBeenCalled();
  });

  it('should accept https URLs with query strings', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAdBanner({
      ...validData,
      href: 'https://example.com/path?x=1',
    });
    expect(result).toEqual({ success: true, id: generatedId });
  });
});
