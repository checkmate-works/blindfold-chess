import { SUPPORTED_LOCALES } from '@/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteArticle } from './deleteArticle';

const mockGetUser = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockDeleteWhere = vi.fn();
const mockRevalidatePath = vi.fn();
const mockRevalidateTag = vi.fn();

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
    slug: 'slug',
  },
  userRoles: { userId: 'user_id' },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
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

  // `/[locale]/articles/[slug]` is the app's only prerendered page, so a
  // delete must invalidate it or the removed article keeps being served from
  // the static cache until the 1800 s ISR window lapses.
  it('should revalidate the public article page for every locale on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    // 1st select = the slug lookup in deleteArticle, 2nd = requireAdmin's role
    mockSelectFromWhere.mockReturnValueOnce([{ slug: 'my-article' }]);
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await deleteArticle(articleId);

    for (const locale of SUPPORTED_LOCALES) {
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/${locale}/articles/my-article`);
    }
    expect(mockRevalidateTag).toHaveBeenCalledWith('articles', { expire: 60 });
  });

  it('should not revalidate the public article page when unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockSelectFromWhere.mockReturnValueOnce([{ slug: 'my-article' }]);

    await deleteArticle(articleId);

    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(mockRevalidateTag).not.toHaveBeenCalled();
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
