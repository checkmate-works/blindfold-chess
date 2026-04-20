import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAdBanner } from './createAdBanner';

const mockGetUser = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockInsertValuesReturning = vi.fn();
const mockUpdateTag = vi.fn();
const mockRevalidatePath = vi.fn();

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

vi.mock('next/cache', () => ({
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
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
    expect(mockUpdateTag).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('should return validation error when slot is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAdBanner({ ...validData, slot: '' });
    expect(result).toEqual({ error: 'invalid slot' });
    expect(mockUpdateTag).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('should successfully create banner and invalidate caches', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAdBanner(validData);

    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockInsertValuesReturning).toHaveBeenCalled();
    expect(mockUpdateTag).toHaveBeenCalledWith('ads-config');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout');
  });
});
