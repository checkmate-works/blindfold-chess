import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toggleAdsEnabled } from './toggleAdsEnabled';

const mockGetUser = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockInsertValues = vi.fn();
const mockOnConflictDoUpdate = vi.fn();
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
    insert: () => ({
      values: (data: unknown) => {
        mockInsertValues(data);
        return {
          onConflictDoUpdate: (conflictData: unknown) => {
            mockOnConflictDoUpdate(conflictData);
            return Promise.resolve();
          },
        };
      },
    }),
  },
  siteSettings: {
    key: 'key',
    value: 'value',
    updatedAt: 'updated_at',
  },
  userRoles: { userId: 'user_id' },
}));

vi.mock('next/cache', () => ({
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

const adminUserId = 'admin-00000000-0000-0000-0000-000000000001';

describe('toggleAdsEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return unauthorized when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await toggleAdsEnabled();
    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockUpdateTag).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('should return unauthorized when user is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'user' }]);

    const result = await toggleAdsEnabled();
    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockUpdateTag).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('should toggle ads_enabled from false to true and invalidate caches', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    // First select: role check (admin), second select: current ads_enabled value (false)
    mockSelectFromWhere
      .mockReturnValueOnce([{ role: 'admin' }])
      .mockReturnValueOnce([{ value: { enabled: false } }]);

    const result = await toggleAdsEnabled();

    expect(result).toEqual({ success: true });
    expect(mockInsertValues).toHaveBeenCalledWith({
      key: 'ads_enabled',
      value: { enabled: true },
    });
    expect(mockUpdateTag).toHaveBeenCalledWith('ads-config');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout');
  });

  it('should toggle ads_enabled from true to false and invalidate caches', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere
      .mockReturnValueOnce([{ role: 'admin' }])
      .mockReturnValueOnce([{ value: { enabled: true } }]);

    const result = await toggleAdsEnabled();

    expect(result).toEqual({ success: true });
    expect(mockInsertValues).toHaveBeenCalledWith({
      key: 'ads_enabled',
      value: { enabled: false },
    });
    expect(mockUpdateTag).toHaveBeenCalledWith('ads-config');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout');
  });

  it('should default to enabling ads when no row exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([]);

    const result = await toggleAdsEnabled();

    expect(result).toEqual({ success: true });
    expect(mockInsertValues).toHaveBeenCalledWith({
      key: 'ads_enabled',
      value: { enabled: true },
    });
    expect(mockUpdateTag).toHaveBeenCalledWith('ads-config');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout');
  });
});
