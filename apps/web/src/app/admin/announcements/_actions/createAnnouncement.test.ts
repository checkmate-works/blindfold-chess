import { beforeEach, describe, expect, it, vi } from 'vitest';

import { whereThenLimit } from '@/lib/db/__test-support__/query-chain';
import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';
import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';

import { createAnnouncement } from './createAnnouncement';

const mockSelectFromWhere = vi.fn();
const mockInsertValuesReturning = vi.fn();
const mockRevalidatePath = vi.fn();
const mockRevalidateTag = vi.fn();
const mockNotifyAllUsersOfAnnouncement = vi.fn();
const mockHasAnnouncementNotification = vi.fn();

const generatedId = 'generated-00000000-0000-0000-0000-000000000001';

vi.mock('@/lib/supabase/server');

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {
    select: () => ({
      from: () => ({
        where: whereThenLimit(mockSelectFromWhere),
      }),
    }),
    insert: () => ({
      values: (data: unknown) => ({
        returning: () => {
          mockInsertValuesReturning(data);
          return (
            mockInsertValuesReturning.mock.results[mockInsertValuesReturning.mock.calls.length - 1]
              ?.value ?? [{ id: generatedId }]
          );
        },
      }),
    }),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

vi.mock('@/lib/notifications/announcement-notification', () => ({
  notifyAllUsersOfAnnouncement: (...args: unknown[]) => mockNotifyAllUsersOfAnnouncement(...args),
  hasAnnouncementNotification: (...args: unknown[]) => mockHasAnnouncementNotification(...args),
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
    mockHasAnnouncementNotification.mockResolvedValue(false);
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
    expect(result).toEqual({ error: 'invalid slug', field: 'slug' });
  });

  it('should return error when slug exceeds 255 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, slug: 'a'.repeat(256) });
    expect(result).toEqual({ error: 'invalid slug', field: 'slug' });
  });

  it('should return error when title is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, title: '' });
    expect(result).toEqual({ error: 'invalid title', field: 'title' });
  });

  it('should return error when title exceeds 255 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, title: 'a'.repeat(256) });
    expect(result).toEqual({ error: 'invalid title', field: 'title' });
  });

  it('should return error when content is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, content: '' });
    expect(result).toEqual({ error: 'invalid content', field: 'content' });
  });

  it('should return error when locale is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, locale: '' });
    expect(result).toEqual({ error: 'invalid locale', field: 'locale' });
  });

  it('should return error when locale exceeds 10 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, locale: 'a'.repeat(11) });
    expect(result).toEqual({ error: 'invalid locale', field: 'locale' });
  });

  it('should return error when status is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, status: 'invalid' });
    expect(result).toEqual({ error: 'invalid status', field: 'status' });
  });

  it('should return error when status is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, status: '' });
    expect(result).toEqual({ error: 'invalid status', field: 'status' });
  });

  it('should return error when visibility is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, visibility: 'private' });
    expect(result).toEqual({ error: 'invalid visibility', field: 'visibility' });
  });

  it('should return error when visibility is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({ ...validData, visibility: '' });
    expect(result).toEqual({ error: 'invalid visibility', field: 'visibility' });
  });

  it('should return error when status is published and publishedAt is not set', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({
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

  it('should trigger notification when status is published and sendNotification is true', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({
      ...validData,
      status: 'published',
      slug: 'published-announcement',
      publishedAt: '2024-06-15T12:00:00Z',
      sendNotification: true,
    });
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockNotifyAllUsersOfAnnouncement).toHaveBeenCalledWith(
      generatedId,
      'published-announcement',
      'Test Announcement'
    );
  });

  it('should NOT trigger notification when sendNotification is true but notification already exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);
    mockHasAnnouncementNotification.mockResolvedValue(true);

    const result = await createAnnouncement({
      ...validData,
      status: 'published',
      slug: 'published-announcement',
      publishedAt: '2024-06-15T12:00:00Z',
      sendNotification: true,
    });
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockHasAnnouncementNotification).toHaveBeenCalledWith(generatedId);
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  it('should NOT trigger notification when status is published but sendNotification is false', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({
      ...validData,
      status: 'published',
      publishedAt: '2024-06-15T12:00:00Z',
      sendNotification: false,
    });
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  it('should NOT trigger notification when status is published and sendNotification is omitted', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({
      ...validData,
      status: 'published',
      publishedAt: '2024-06-15T12:00:00Z',
    });
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  it('should NOT trigger notification when status is draft', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement(validData);
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  it('should NOT trigger notification when status is draft even with sendNotification true', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await createAnnouncement({
      ...validData,
      status: 'draft',
      sendNotification: true,
    });
    expect(result).toEqual({ success: true, id: generatedId });
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  it('should call revalidatePath after successful creation', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await createAnnouncement(validData);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/announcements');
  });

  it('should call revalidateTag("announcements") after successful creation', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await createAnnouncement(validData);
    expect(mockRevalidateTag).toHaveBeenCalledWith('announcements', { expire: 60 });
  });

  it('should not call revalidatePath when unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await createAnnouncement(validData);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('should not call revalidateTag when unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await createAnnouncement(validData);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('should not call revalidatePath when validation fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await createAnnouncement({ ...validData, slug: '' });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  // --- Edge cases ---

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
    expect(result).toEqual({ error: 'invalid slug', field: 'slug' });
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

  it('should not call hasAnnouncementNotification when sendNotification is false', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await createAnnouncement({
      ...validData,
      status: 'published',
      publishedAt: '2024-06-15T12:00:00Z',
      sendNotification: false,
    });
    expect(mockHasAnnouncementNotification).not.toHaveBeenCalled();
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  it('should not call hasAnnouncementNotification when status is draft', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await createAnnouncement({
      ...validData,
      status: 'draft',
      sendNotification: true,
    });
    expect(mockHasAnnouncementNotification).not.toHaveBeenCalled();
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  it('should call hasAnnouncementNotification with inserted id when sendNotification is true and published', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);
    mockHasAnnouncementNotification.mockResolvedValue(false);

    await createAnnouncement({
      ...validData,
      status: 'published',
      publishedAt: '2024-06-15T12:00:00Z',
      sendNotification: true,
    });
    expect(mockHasAnnouncementNotification).toHaveBeenCalledTimes(1);
    expect(mockHasAnnouncementNotification).toHaveBeenCalledWith(generatedId);
    expect(mockNotifyAllUsersOfAnnouncement).toHaveBeenCalledTimes(1);
  });

  // --- Unique constraint violation handling ---

  it('should return friendly error on unique violation (code on error)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const pgError = new Error(
      'duplicate key value violates unique constraint "uq_announcements_slug_locale"'
    );
    (pgError as unknown as Record<string, string>).code = '23505';
    mockInsertValuesReturning.mockImplementation(() => {
      throw pgError;
    });

    const result = await createAnnouncement(validData);
    expect(result).toEqual({ error: 'An announcement with this slug and locale already exists' });
  });

  it('should return friendly error on unique violation (code on cause)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const cause = new Error(
      'duplicate key value violates unique constraint "uq_announcements_slug_locale"'
    );
    (cause as unknown as Record<string, string>).code = '23505';
    const wrappedError = new Error('Failed query: insert into "announcements"...', { cause });
    mockInsertValuesReturning.mockImplementation(() => {
      throw wrappedError;
    });

    const result = await createAnnouncement(validData);
    expect(result).toEqual({ error: 'An announcement with this slug and locale already exists' });
  });

  it('should rethrow non-unique-violation errors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    mockInsertValuesReturning.mockImplementation(() => {
      throw new Error('Connection failed');
    });

    await expect(createAnnouncement(validData)).rejects.toThrow('Connection failed');
  });

  it('should not call revalidateTag on unique violation', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const pgError = new Error('duplicate key value violates unique constraint');
    (pgError as unknown as Record<string, string>).code = '23505';
    mockInsertValuesReturning.mockImplementation(() => {
      throw pgError;
    });

    await createAnnouncement(validData);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('should not trigger notification on unique violation', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const pgError = new Error('duplicate key value violates unique constraint');
    (pgError as unknown as Record<string, string>).code = '23505';
    mockInsertValuesReturning.mockImplementation(() => {
      throw pgError;
    });

    await createAnnouncement({
      ...validData,
      status: 'published',
      publishedAt: '2024-06-15T12:00:00Z',
      sendNotification: true,
    });
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });
});
