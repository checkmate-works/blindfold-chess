import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAnnouncement } from './createAnnouncement';

const mockGetUser = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockInsertValuesReturning = vi.fn();
const mockRevalidatePath = vi.fn();
const mockNotifyAllUsersOfAnnouncement = vi.fn();

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
  announcements: {
    id: 'id',
    slug: 'slug',
    title: 'title',
    content: 'content',
    locale: 'locale',
    status: 'status',
    visibility: 'visibility',
    pinnedAt: 'pinned_at',
    publishedAt: 'published_at',
  },
  userRoles: { userId: 'user_id' },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock('@/lib/announcement-notification', () => ({
  notifyAllUsersOfAnnouncement: (...args: unknown[]) => mockNotifyAllUsersOfAnnouncement(...args),
}));

const adminUserId = 'admin-00000000-0000-0000-0000-000000000001';

const validData = {
  slug: 'test-announcement',
  title: 'Test Announcement',
  content: 'This is a test announcement.',
  locale: 'en',
  status: 'draft',
  visibility: 'public',
  pinnedAt: null,
  publishedAt: null,
};

describe('createAnnouncement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return unauthorized when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await createAnnouncement(validData);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return unauthorized when user is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'user' }]);

    const result = await createAnnouncement(validData);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return unauthorized when no userRole record exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([]);

    const result = await createAnnouncement(validData);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return error when slug is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, slug: '' });
    expect(result).toEqual({ error: 'invalid slug' });
  });

  it('should return error when slug exceeds 255 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, slug: 'a'.repeat(256) });
    expect(result).toEqual({ error: 'invalid slug' });
  });

  it('should return error when title is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, title: '' });
    expect(result).toEqual({ error: 'invalid title' });
  });

  it('should return error when title exceeds 255 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, title: 'a'.repeat(256) });
    expect(result).toEqual({ error: 'invalid title' });
  });

  it('should return error when content is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, content: '' });
    expect(result).toEqual({ error: 'invalid content' });
  });

  it('should return error when locale is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, locale: '' });
    expect(result).toEqual({ error: 'invalid locale' });
  });

  it('should return error when locale exceeds 10 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, locale: 'a'.repeat(11) });
    expect(result).toEqual({ error: 'invalid locale' });
  });

  it('should return error when status is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, status: 'invalid' });
    expect(result).toEqual({ error: 'invalid status' });
  });

  it('should return error when status is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, status: '' });
    expect(result).toEqual({ error: 'invalid status' });
  });

  it('should return error when visibility is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, visibility: 'private' });
    expect(result).toEqual({ error: 'invalid visibility' });
  });

  it('should return error when visibility is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, visibility: '' });
    expect(result).toEqual({ error: 'invalid visibility' });
  });

  it('should return error when status is published and publishedAt is not set', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({
      ...validData,
      status: 'published',
      publishedAt: null,
    });
    expect(result).toEqual({ error: 'Published date is required when status is published' });
  });

  it('should succeed when status is published and publishedAt is set', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({
      ...validData,
      status: 'published',
      publishedAt: '2024-06-15T12:00:00Z',
    });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should succeed when status is draft and publishedAt is not set', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, status: 'draft', publishedAt: null });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should succeed when status is draft and publishedAt is set', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({
      ...validData,
      status: 'draft',
      publishedAt: '2024-06-15T12:00:00Z',
    });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should successfully create announcement with valid data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement(validData);
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockInsertValuesReturning).toHaveBeenCalledWith({
      slug: 'test-announcement',
      title: 'Test Announcement',
      content: 'This is a test announcement.',
      locale: 'en',
      status: 'draft',
      visibility: 'public',
      pinnedAt: null,
      publishedAt: null,
    });
  });

  it('should accept members_only as a valid visibility', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, visibility: 'members_only' });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should parse pinnedAt as Date when provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({
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

    const result = await createAnnouncement({
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

  it('should trigger notification when status is published', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({
      ...validData,
      status: 'published',
      slug: 'published-announcement',
      publishedAt: '2024-06-15T12:00:00Z',
    });
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockNotifyAllUsersOfAnnouncement).toHaveBeenCalledWith(
      generatedId,
      'published-announcement',
      'Test Announcement'
    );
  });

  it('should NOT trigger notification when status is draft', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement(validData);
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  it('should call revalidatePath after successful creation', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await createAnnouncement(validData);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/announcements');
  });

  it('should not call revalidatePath when unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await createAnnouncement(validData);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('should not call revalidatePath when validation fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await createAnnouncement({ ...validData, slug: '' });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  // --- Edge case tests added by Tester ---

  it('should succeed when slug is exactly 255 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, slug: 'a'.repeat(255) });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should succeed when title is exactly 255 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, title: 'a'.repeat(255) });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should succeed when locale is exactly 10 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, locale: 'a'.repeat(10) });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should return error when slug is exactly 1 character over limit', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, slug: 'a'.repeat(256) });
    expect(result).toEqual({ error: 'invalid slug' });
  });

  it('should succeed with single character slug', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, slug: 'x' });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should succeed with single character content', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, content: 'x' });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should succeed with markdown special characters in content', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const specialContent =
      '# Heading\n\n**bold** _italic_ ~~strike~~\n\n```code```\n\n| col1 | col2 |\n|------|------|\n| a    | b    |';
    const result = await createAnnouncement({ ...validData, content: specialContent });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should succeed with very long content', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const longContent = 'x'.repeat(100000);
    const result = await createAnnouncement({ ...validData, content: longContent });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should succeed with unicode characters in title and content', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({
      ...validData,
      title: 'お知らせ - Announcement 🎉',
      content: '日本語のコンテンツです。\n\nEmoji: 🏁♟️👑',
    });
    expect(result).toEqual({ success: true, id: generatedId });
  });

  it('should not trigger notification and not call revalidatePath when publishedAt validation fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await createAnnouncement({
      ...validData,
      status: 'published',
      publishedAt: null,
    });
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
