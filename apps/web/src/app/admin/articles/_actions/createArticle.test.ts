import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createArticle } from './createArticle';

const mockGetUser = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockInsertValuesReturning = vi.fn();
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
  articles: {
    id: 'id',
    slug: 'slug',
    title: 'title',
    content: 'content',
    locale: 'locale',
    status: 'status',
    pinnedAt: 'pinned_at',
    publishedAt: 'published_at',
    excerpt: 'excerpt',
    description: 'description',
    categoryId: 'category_id',
    icon: 'icon',
  },
  userRoles: { userId: 'user_id' },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

const adminUserId = 'admin-00000000-0000-0000-0000-000000000001';

const validData = {
  slug: 'test-article',
  title: 'Test Article',
  content: 'This is a test article.',
  locale: 'en',
  status: 'draft',
  pinnedAt: null,
  publishedAt: null,
  excerpt: null,
  description: null,
  categoryId: null,
  icon: null,
};

describe('createArticle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return unauthorized when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await createArticle(validData);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return unauthorized when user is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'user' }]);

    const result = await createArticle(validData);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return unauthorized when no userRole record exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([]);

    const result = await createArticle(validData);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return error when slug is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, slug: '' });
    expect(result).toEqual({ error: 'invalid slug' });
  });

  it('should return error when slug exceeds 255 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, slug: 'a'.repeat(256) });
    expect(result).toEqual({ error: 'invalid slug' });
  });

  it('should return error when title is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, title: '' });
    expect(result).toEqual({ error: 'invalid title' });
  });

  it('should return error when title exceeds 255 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, title: 'a'.repeat(256) });
    expect(result).toEqual({ error: 'invalid title' });
  });

  it('should return error when content is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, content: '' });
    expect(result).toEqual({ error: 'invalid content' });
  });

  it('should return error when locale is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, locale: '' });
    expect(result).toEqual({ error: 'invalid locale' });
  });

  it('should return error when locale exceeds 10 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, locale: 'a'.repeat(11) });
    expect(result).toEqual({ error: 'invalid locale' });
  });

  it('should return error when status is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, status: 'invalid' });
    expect(result).toEqual({ error: 'invalid status' });
  });

  it('should return error when status is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, status: '' });
    expect(result).toEqual({ error: 'invalid status' });
  });

  it('should return error when status is published and publishedAt is not set', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({
      ...validData,
      status: 'published',
      publishedAt: null,
    });
    expect(result).toEqual({ error: 'Published date is required when status is published' });
  });

  it('should succeed when status is published and publishedAt is set', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({
      ...validData,
      status: 'published',
      publishedAt: '2024-06-15T12:00:00Z',
    });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should succeed when status is draft and publishedAt is not set', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, status: 'draft', publishedAt: null });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should succeed when status is draft and publishedAt is set', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({
      ...validData,
      status: 'draft',
      publishedAt: '2024-06-15T12:00:00Z',
    });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should return error when icon exceeds 10 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, icon: 'a'.repeat(11) });
    expect(result).toEqual({ error: 'invalid icon' });
  });

  it('should succeed when icon is exactly 10 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, icon: 'a'.repeat(10) });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should include new fields in INSERT values', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({
      ...validData,
      excerpt: 'Test excerpt',
      description: 'Test description',
      categoryId: 'cat-123',
      icon: '♟️',
    });
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockInsertValuesReturning).toHaveBeenCalledWith(
      expect.objectContaining({
        excerpt: 'Test excerpt',
        description: 'Test description',
        categoryId: 'cat-123',
        icon: '♟️',
      })
    );
  });

  it('should successfully create article with valid data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle(validData);
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockInsertValuesReturning).toHaveBeenCalledWith({
      slug: 'test-article',
      title: 'Test Article',
      content: 'This is a test article.',
      locale: 'en',
      status: 'draft',
      pinnedAt: null,
      publishedAt: null,
      excerpt: null,
      description: null,
      categoryId: null,
      icon: null,
    });
  });

  it('should parse pinnedAt as Date when provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({
      ...validData,
      pinnedAt: '2024-01-01T00:00:00Z',
    });
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockInsertValuesReturning).toHaveBeenCalledWith(
      expect.objectContaining({
        pinnedAt: new Date('2024-01-01T00:00:00Z'),
      })
    );
  });

  it('should parse publishedAt as Date when provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({
      ...validData,
      publishedAt: '2024-06-15T12:00:00Z',
    });
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockInsertValuesReturning).toHaveBeenCalledWith(
      expect.objectContaining({
        publishedAt: new Date('2024-06-15T12:00:00Z'),
      })
    );
  });

  it('should call revalidatePath after successful creation', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await createArticle(validData);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/articles');
  });

  it('should not call revalidatePath when unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await createArticle(validData);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('should not call revalidatePath when validation fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await createArticle({ ...validData, slug: '' });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  // --- Edge case tests added by Tester ---

  it('should succeed when slug is exactly 255 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, slug: 'a'.repeat(255) });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should succeed when title is exactly 255 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, title: 'a'.repeat(255) });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should succeed when locale is exactly 10 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, locale: 'a'.repeat(10) });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should return error when slug is exactly 1 character over limit', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, slug: 'a'.repeat(256) });
    expect(result).toEqual({ error: 'invalid slug' });
  });

  it('should succeed with single character slug', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, slug: 'x' });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should succeed with single character content', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, content: 'x' });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should succeed with markdown special characters in content', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const specialContent =
      '# Heading\n\n**bold** _italic_ ~~strike~~\n\n```code```\n\n| col1 | col2 |\n|------|------|\n| a    | b    |';
    const result = await createArticle({ ...validData, content: specialContent });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should succeed with very long content', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const longContent = 'x'.repeat(100000);
    const result = await createArticle({ ...validData, content: longContent });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should succeed with unicode characters in title and content', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({
      ...validData,
      title: 'Article Title',
      content: 'Content with unicode characters',
    });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should not call revalidatePath when publishedAt validation fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await createArticle({
      ...validData,
      status: 'published',
      publishedAt: null,
    });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  // --- articles-specific: NO visibility validation ---

  it('should NOT have visibility field in create data (articles have no visibility)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle(validData);
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockInsertValuesReturning).toHaveBeenCalledWith(
      expect.not.objectContaining({ visibility: expect.anything() })
    );
  });

  // --- articles-specific: NO notification feature ---

  it('should NOT have any notification-related behavior', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({
      ...validData,
      status: 'published',
      publishedAt: '2024-06-15T12:00:00Z',
    });
    expect(result).toEqual({ success: true, id: generatedId });
    // No notification function should be called - articles don't have notification feature
  });

  // --- Null / empty-string handling for new optional fields ---

  it('should convert empty string excerpt to null in INSERT values', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, excerpt: '' });
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockInsertValuesReturning).toHaveBeenCalledWith(
      expect.objectContaining({ excerpt: null })
    );
  });

  it('should convert empty string description to null in INSERT values', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, description: '' });
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockInsertValuesReturning).toHaveBeenCalledWith(
      expect.objectContaining({ description: null })
    );
  });

  it('should convert empty string categoryId to null in INSERT values', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, categoryId: '' });
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockInsertValuesReturning).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: null })
    );
  });

  it('should convert empty string icon to null in INSERT values', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, icon: '' });
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockInsertValuesReturning).toHaveBeenCalledWith(expect.objectContaining({ icon: null }));
  });

  it('should pass null excerpt directly through to INSERT values', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, excerpt: null });
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockInsertValuesReturning).toHaveBeenCalledWith(
      expect.objectContaining({ excerpt: null })
    );
  });

  it('should pass null description directly through to INSERT values', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, description: null });
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockInsertValuesReturning).toHaveBeenCalledWith(
      expect.objectContaining({ description: null })
    );
  });

  it('should pass null categoryId directly through to INSERT values', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, categoryId: null });
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockInsertValuesReturning).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: null })
    );
  });

  it('should pass null icon directly through to INSERT values', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, icon: null });
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockInsertValuesReturning).toHaveBeenCalledWith(expect.objectContaining({ icon: null }));
  });

  it('should succeed when icon is a single emoji character', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createArticle({ ...validData, icon: '♟' });
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockInsertValuesReturning).toHaveBeenCalledWith(expect.objectContaining({ icon: '♟' }));
  });
});
