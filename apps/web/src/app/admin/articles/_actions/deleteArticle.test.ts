import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteArticle } from './deleteArticle';

const mockGetUser = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockDeleteWhere = vi.fn();
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
    delete: () => ({
      where: mockDeleteWhere,
    }),
  },
  articles: {
    id: 'id',
  },
  userRoles: { userId: 'user_id' },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

const adminUserId = 'admin-00000000-0000-0000-0000-000000000001';
const articleId = 'art-00000000-0000-0000-0000-000000000001';

describe('deleteArticle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return unauthorized when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await deleteArticle(articleId);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return unauthorized when user is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'user' }]);

    const result = await deleteArticle(articleId);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return unauthorized when no userRole record exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([]);

    const result = await deleteArticle(articleId);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should successfully delete article', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await deleteArticle(articleId);
    expect(result).toEqual({ success: true });
    expect(mockDeleteWhere).toHaveBeenCalled();
  });

  it('should call revalidatePath after successful deletion', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await deleteArticle(articleId);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/articles');
  });

  it('should not call revalidatePath when unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await deleteArticle(articleId);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('should return success even when article ID does not exist (no-op delete)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await deleteArticle('nonexistent-id');
    expect(result).toEqual({ success: true });
    expect(mockDeleteWhere).toHaveBeenCalled();
  });
});
