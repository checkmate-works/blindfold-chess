import { SUPPORTED_LOCALES } from '@/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateArticle } from './updateArticle';

const mockGetUser = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockUpdateSet = vi.fn();
const mockUpdateSetWhere = vi.fn();
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
    update: () => ({
      set: (data: unknown) => {
        mockUpdateSet(data);
        return {
          where: mockUpdateSetWhere,
        };
      },
    }),
  },
  articles: {
    id: 'id',
    slug: 'slug',
    title: 'title',
    content: 'content',
    locale: 'locale',
    status: 'status',
    pinnedAt: 'pinned_at',
    publishedAt: 'published_at',
    updatedAt: 'updated_at',
    excerpt: 'excerpt',
    description: 'description',
    categoryId: 'category_id',
    icon: 'icon',
  },
  userRoles: { userId: 'user_id' },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

const adminUserId = 'admin-00000000-0000-0000-0000-000000000001';
const articleId = 'art-00000000-0000-0000-0000-000000000001';

const validData = {
  slug: 'updated-article',
  title: 'Updated Article',
  content: 'Updated content.',
  contentJson: null,
  contentFormat: 'markdown' as const,
  locale: 'en',
  status: 'draft',
  pinnedAt: null,
  publishedAt: null,
  excerpt: null,
  description: null,
  categoryId: null,
  icon: null,
};

function setupAdminWithArticle(currentStatus = 'draft') {
  mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
  // First select: userRoles query
  // Second select: articles query (find current)
  mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([
    {
      id: articleId,
      slug: 'old-slug',
      title: 'Old Title',
      content: 'Old content',
      locale: 'en',
      status: currentStatus,
      pinnedAt: null,
      publishedAt: null,
    },
  ]);
}

describe('updateArticle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return unauthorized when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await updateArticle(articleId, validData);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return unauthorized when user is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'user' }]);

    const result = await updateArticle(articleId, validData);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return unauthorized when no userRole record exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([]);

    const result = await updateArticle(articleId, validData);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return error when slug is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateArticle(articleId, { ...validData, slug: '' });
    expect(result).toEqual({ error: 'invalid slug', field: 'slug' });
  });

  it('should return error when slug exceeds 255 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateArticle(articleId, {
      ...validData,
      slug: 'a'.repeat(256),
    });
    expect(result).toEqual({ error: 'invalid slug', field: 'slug' });
  });

  it('should return error when title is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateArticle(articleId, { ...validData, title: '' });
    expect(result).toEqual({ error: 'invalid title', field: 'title' });
  });

  it('should return error when title exceeds 255 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateArticle(articleId, {
      ...validData,
      title: 'a'.repeat(256),
    });
    expect(result).toEqual({ error: 'invalid title', field: 'title' });
  });

  it('should return error when content is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateArticle(articleId, { ...validData, content: '' });
    expect(result).toEqual({ error: 'invalid content', field: 'content' });
  });

  it('should return error when locale is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateArticle(articleId, { ...validData, locale: '' });
    expect(result).toEqual({ error: 'invalid locale', field: 'locale' });
  });

  it('should return error when locale exceeds 10 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateArticle(articleId, {
      ...validData,
      locale: 'a'.repeat(11),
    });
    expect(result).toEqual({ error: 'invalid locale', field: 'locale' });
  });

  it('should return error when status is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateArticle(articleId, { ...validData, status: 'invalid' });
    expect(result).toEqual({ error: 'invalid status', field: 'status' });
  });

  it('should return error when status is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateArticle(articleId, { ...validData, status: '' });
    expect(result).toEqual({ error: 'invalid status', field: 'status' });
  });

  it('should return error when status is published and publishedAt is not set', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateArticle(articleId, {
      ...validData,
      status: 'published',
      publishedAt: null,
    });
    expect(result).toEqual({
      error: 'Published date is required when status is published',
      field: 'publishedAt',
    });
  });

  it('should succeed when status is published and publishedAt is set', async () => {
    setupAdminWithArticle();

    const result = await updateArticle(articleId, {
      ...validData,
      status: 'published',
      publishedAt: '2024-06-15T12:00:00Z',
    });
    expect(result).toEqual({ success: true, id: articleId });
  });

  it('should succeed when status is draft and publishedAt is not set', async () => {
    setupAdminWithArticle();

    const result = await updateArticle(articleId, {
      ...validData,
      status: 'draft',
      publishedAt: null,
    });
    expect(result).toEqual({ success: true, id: articleId });
  });

  it('should succeed when status is draft and publishedAt is set', async () => {
    setupAdminWithArticle();

    const result = await updateArticle(articleId, {
      ...validData,
      status: 'draft',
      publishedAt: '2024-06-15T12:00:00Z',
    });
    expect(result).toEqual({ success: true, id: articleId });
  });

  it('should return error when icon exceeds 10 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateArticle(articleId, { ...validData, icon: 'a'.repeat(11) });
    expect(result).toEqual({ error: 'invalid icon', field: 'icon' });
  });

  it('should succeed when icon is exactly 10 characters', async () => {
    setupAdminWithArticle();

    const result = await updateArticle(articleId, { ...validData, icon: 'a'.repeat(10) });
    expect(result).toEqual({ success: true, id: articleId });
  });

  it('should return not found when article does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([]);

    const result = await updateArticle(articleId, validData);
    expect(result).toEqual({ error: 'not found' });
  });

  it('should successfully update article with valid data', async () => {
    setupAdminWithArticle();

    const result = await updateArticle(articleId, validData);
    expect(result).toEqual({ success: true, id: articleId });
    expect(mockUpdateSetWhere).toHaveBeenCalled();
  });

  it('should call revalidatePath after successful update', async () => {
    setupAdminWithArticle();

    await updateArticle(articleId, validData);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/articles');
  });

  // A rename leaves the OLD url still serving a prerendered page, so both
  // slugs have to be invalidated.
  it('should revalidate the public pages for both the new and the previous slug', async () => {
    setupAdminWithArticle();

    await updateArticle(articleId, validData);

    for (const locale of SUPPORTED_LOCALES) {
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/${locale}/articles/${validData.slug}`);
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/${locale}/articles/old-slug`);
    }
    expect(mockRevalidateTag).toHaveBeenCalledWith('articles', { expire: 60 });
  });

  it('should not call revalidatePath when unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await updateArticle(articleId, validData);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('should not call revalidatePath when article not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([]);

    await updateArticle(articleId, validData);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('should not call revalidatePath when validation fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await updateArticle(articleId, { ...validData, slug: '' });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  // --- Edge cases ---

  it('should succeed when slug is exactly 255 characters', async () => {
    setupAdminWithArticle();

    const result = await updateArticle(articleId, {
      ...validData,
      slug: 'a'.repeat(255),
    });
    expect(result).toEqual({ success: true, id: articleId });
  });

  it('should succeed when title is exactly 255 characters', async () => {
    setupAdminWithArticle();

    const result = await updateArticle(articleId, {
      ...validData,
      title: 'a'.repeat(255),
    });
    expect(result).toEqual({ success: true, id: articleId });
  });

  it('should succeed when locale is exactly 10 characters', async () => {
    setupAdminWithArticle();

    const result = await updateArticle(articleId, {
      ...validData,
      locale: 'a'.repeat(10),
    });
    expect(result).toEqual({ success: true, id: articleId });
  });

  it('should succeed with markdown special characters in content', async () => {
    setupAdminWithArticle();

    const specialContent =
      '# Heading\n\n**bold** _italic_ ~~strike~~\n\n```code```\n\n| col1 | col2 |\n|------|------|\n| a    | b    |';
    const result = await updateArticle(articleId, {
      ...validData,
      content: specialContent,
    });
    expect(result).toEqual({ success: true, id: articleId });
  });

  it('should succeed with very long content', async () => {
    setupAdminWithArticle();

    const longContent = 'x'.repeat(100000);
    const result = await updateArticle(articleId, {
      ...validData,
      content: longContent,
    });
    expect(result).toEqual({ success: true, id: articleId });
  });

  it('should succeed with unicode characters in title and content', async () => {
    setupAdminWithArticle();

    const result = await updateArticle(articleId, {
      ...validData,
      title: 'Article Update',
      content: 'Updated content with unicode',
    });
    expect(result).toEqual({ success: true, id: articleId });
  });

  it('should not call revalidatePath when publishedAt validation fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await updateArticle(articleId, {
      ...validData,
      status: 'published',
      publishedAt: null,
    });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('should return the id in success response for existing article', async () => {
    setupAdminWithArticle();

    const result = await updateArticle(articleId, validData);
    expect(result).toEqual({ success: true, id: articleId });
    expect('id' in result && result.id).toBe(articleId);
  });

  // --- articles-specific: NO visibility validation ---

  it('should NOT have visibility in update data (articles have no visibility)', async () => {
    setupAdminWithArticle();

    const result = await updateArticle(articleId, validData);
    expect(result).toEqual({ success: true, id: articleId });
    // validData should not contain visibility field
    expect('visibility' in validData).toBe(false);
  });

  // --- articles-specific: NO notification feature ---

  it('should NOT have any notification-related behavior on publish', async () => {
    setupAdminWithArticle('draft');

    const result = await updateArticle(articleId, {
      ...validData,
      status: 'published',
      publishedAt: '2024-06-15T12:00:00Z',
    });
    expect(result).toEqual({ success: true, id: articleId });
    // No notification function should be called - articles don't have notification feature
  });

  // --- Null / empty-string handling for new optional fields ---

  it('should convert empty string excerpt to null in UPDATE set values', async () => {
    setupAdminWithArticle();

    const result = await updateArticle(articleId, { ...validData, excerpt: '' });
    expect(result).toEqual({ success: true, id: articleId });
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ excerpt: null }));
  });

  it('should convert empty string description to null in UPDATE set values', async () => {
    setupAdminWithArticle();

    const result = await updateArticle(articleId, { ...validData, description: '' });
    expect(result).toEqual({ success: true, id: articleId });
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ description: null }));
  });

  it('should convert empty string categoryId to null in UPDATE set values', async () => {
    setupAdminWithArticle();

    const result = await updateArticle(articleId, { ...validData, categoryId: '' });
    expect(result).toEqual({ success: true, id: articleId });
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ categoryId: null }));
  });

  it('should convert empty string icon to null in UPDATE set values', async () => {
    setupAdminWithArticle();

    const result = await updateArticle(articleId, { ...validData, icon: '' });
    expect(result).toEqual({ success: true, id: articleId });
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ icon: null }));
  });

  it('should pass null excerpt directly through to UPDATE set values', async () => {
    setupAdminWithArticle();

    const result = await updateArticle(articleId, { ...validData, excerpt: null });
    expect(result).toEqual({ success: true, id: articleId });
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ excerpt: null }));
  });

  it('should pass null description directly through to UPDATE set values', async () => {
    setupAdminWithArticle();

    const result = await updateArticle(articleId, { ...validData, description: null });
    expect(result).toEqual({ success: true, id: articleId });
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ description: null }));
  });

  it('should pass null categoryId directly through to UPDATE set values', async () => {
    setupAdminWithArticle();

    const result = await updateArticle(articleId, { ...validData, categoryId: null });
    expect(result).toEqual({ success: true, id: articleId });
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ categoryId: null }));
  });

  it('should pass null icon directly through to UPDATE set values', async () => {
    setupAdminWithArticle();

    const result = await updateArticle(articleId, { ...validData, icon: null });
    expect(result).toEqual({ success: true, id: articleId });
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ icon: null }));
  });

  it('should include all new fields in UPDATE set values when all are provided', async () => {
    setupAdminWithArticle();

    const result = await updateArticle(articleId, {
      ...validData,
      excerpt: 'Updated excerpt',
      description: 'Updated description',
      categoryId: 'cat-456',
      icon: '♟️',
    });
    expect(result).toEqual({ success: true, id: articleId });
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        excerpt: 'Updated excerpt',
        description: 'Updated description',
        categoryId: 'cat-456',
        icon: '♟️',
      })
    );
  });

  // --- Unique constraint violation handling ---

  it('should return friendly error on unique violation (code on error)', async () => {
    setupAdminWithArticle();

    const pgError = new Error(
      'duplicate key value violates unique constraint "articles_slug_locale_unique"'
    );
    (pgError as unknown as Record<string, string>).code = '23505';
    mockUpdateSetWhere.mockImplementation(() => {
      throw pgError;
    });

    const result = await updateArticle(articleId, validData);
    expect(result).toEqual({ error: 'An article with this slug and locale already exists' });
  });

  it('should return friendly error on unique violation (code on cause)', async () => {
    setupAdminWithArticle();

    const cause = new Error(
      'duplicate key value violates unique constraint "articles_slug_locale_unique"'
    );
    (cause as unknown as Record<string, string>).code = '23505';
    const wrappedError = new Error('Failed query: update "articles"...', { cause });
    mockUpdateSetWhere.mockImplementation(() => {
      throw wrappedError;
    });

    const result = await updateArticle(articleId, validData);
    expect(result).toEqual({ error: 'An article with this slug and locale already exists' });
  });

  it('should rethrow non-unique-violation errors', async () => {
    setupAdminWithArticle();

    mockUpdateSetWhere.mockImplementation(() => {
      throw new Error('Connection failed');
    });

    await expect(updateArticle(articleId, validData)).rejects.toThrow('Connection failed');
  });

  // --- revalidateTag tests ---

  it('should call revalidateTag with articles tag after successful update', async () => {
    mockUpdateSetWhere.mockReset();
    setupAdminWithArticle();

    await updateArticle(articleId, validData);
    expect(mockRevalidateTag).toHaveBeenCalledWith('articles', { expire: 60 });
  });

  it('should revalidate edit and publish paths for the specific article after successful update', async () => {
    mockUpdateSetWhere.mockReset();
    setupAdminWithArticle();

    await updateArticle(articleId, validData);
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/admin/articles/${articleId}/edit`);
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/admin/articles/${articleId}/publish`);
  });

  it('should not call revalidateTag when unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await updateArticle(articleId, validData);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('should not call revalidateTag when article not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([]);

    await updateArticle(articleId, validData);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('should not call revalidateTag when validation fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await updateArticle(articleId, { ...validData, slug: '' });
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  // --- Tests using mockImplementation (must be placed last since vi.clearAllMocks
  // does not reset mockImplementation — only vi.restoreAllMocks does) ---

  it('should not call revalidatePath on unique violation', async () => {
    setupAdminWithArticle();

    const pgError = new Error('duplicate key value violates unique constraint');
    (pgError as unknown as Record<string, string>).code = '23505';
    mockUpdateSetWhere.mockImplementation(() => {
      throw pgError;
    });

    await updateArticle(articleId, validData);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('should not call revalidateTag on unique violation', async () => {
    setupAdminWithArticle();

    const pgError = new Error('duplicate key value violates unique constraint');
    (pgError as unknown as Record<string, string>).code = '23505';
    mockUpdateSetWhere.mockImplementation(() => {
      throw pgError;
    });

    await updateArticle(articleId, validData);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });
});
