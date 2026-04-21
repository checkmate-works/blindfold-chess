import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateAdBanner } from './updateAdBanner';

const mockGetUser = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockUpdateSetWhere = vi.fn();
const mockUpdateTag = vi.fn();
const mockRevalidatePath = vi.fn();

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
    update: () => ({
      set: (data: unknown) => ({
        where: (...args: unknown[]) => {
          mockUpdateSetWhere(data, ...args);
          return Promise.resolve();
        },
      }),
    }),
  },
  adBanners: { id: 'id' },
  userRoles: { userId: 'user_id' },
}));

vi.mock('next/cache', () => ({
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

const adminUserId = 'admin-00000000-0000-0000-0000-000000000001';
const bannerId = 'banner-00000000-0000-0000-0000-000000000001';

const validData = {
  href: 'https://example.com',
  imagePath: '/banners/test.png',
  alt: 'Test banner',
  isActive: true,
};

describe('updateAdBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return unauthorized when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await updateAdBanner(bannerId, validData);
    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockUpdateTag).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('should return validation error when href is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAdBanner(bannerId, { ...validData, href: '' });
    expect(result).toEqual({ error: 'invalid href' });
    expect(mockUpdateTag).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('should successfully update banner and invalidate caches', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAdBanner(bannerId, validData);

    expect(result).toEqual({ success: true });
    expect(mockUpdateSetWhere).toHaveBeenCalled();
    expect(mockUpdateTag).toHaveBeenCalledWith('ads-config');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout');
  });

  it('should reject javascript: href', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAdBanner(bannerId, {
      ...validData,
      href: 'javascript:alert(1)',
    });
    expect(result).toEqual({ error: 'invalid href' });
    expect(mockUpdateSetWhere).not.toHaveBeenCalled();
  });

  it('should reject data: href', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAdBanner(bannerId, {
      ...validData,
      href: 'data:text/html,<script>alert(1)</script>',
    });
    expect(result).toEqual({ error: 'invalid href' });
    expect(mockUpdateSetWhere).not.toHaveBeenCalled();
  });

  it('should reject unparseable href', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAdBanner(bannerId, { ...validData, href: 'not a url' });
    expect(result).toEqual({ error: 'invalid href' });
    expect(mockUpdateSetWhere).not.toHaveBeenCalled();
  });

  it('should accept https URLs with query strings', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAdBanner(bannerId, {
      ...validData,
      href: 'https://example.com/path?x=1',
    });
    expect(result).toEqual({ success: true });
  });
});
