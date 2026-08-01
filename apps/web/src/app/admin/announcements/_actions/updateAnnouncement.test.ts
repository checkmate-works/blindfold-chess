import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateAnnouncement } from './updateAnnouncement';

const mockGetUser = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockUpdateSetWhere = vi.fn();
const mockRevalidatePath = vi.fn();
const mockRevalidateTag = vi.fn();
const mockNotifyAllUsersOfAnnouncement = vi.fn();
const mockHasAnnouncementNotification = vi.fn();

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
      set: () => ({
        where: mockUpdateSetWhere,
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
    updatedAt: 'updated_at',
  },
  userRoles: { userId: 'user_id' },
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
const announcementId = 'ann-00000000-0000-0000-0000-000000000001';

const validData = {
  slug: 'updated-announcement',
  title: 'Updated Announcement',
  content: 'Updated content.',
  locale: 'en',
  status: 'draft',
  visibility: 'public',
  showAsBanner: false,
  pinnedAt: null,
  publishedAt: null,
};

function setupAdminWithAnnouncement(currentStatus = 'draft') {
  mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
  // First select: userRoles query
  // Second select: announcements query (find current)
  mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([
    {
      id: announcementId,
      slug: 'old-slug',
      title: 'Old Title',
      content: 'Old content',
      locale: 'en',
      status: currentStatus,
      visibility: 'public',
      pinnedAt: null,
      publishedAt: null,
    },
  ]);
}

describe('updateAnnouncement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasAnnouncementNotification.mockResolvedValue(false);
  });

  it('should return unauthorized when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await updateAnnouncement(announcementId, validData);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return unauthorized when user is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'user' }]);

    const result = await updateAnnouncement(announcementId, validData);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return unauthorized when no userRole record exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([]);

    const result = await updateAnnouncement(announcementId, validData);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return error when slug is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, { ...validData, slug: '' });
    expect(result).toEqual({ error: 'invalid slug', field: 'slug' });
  });

  it('should return error when slug exceeds 255 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      slug: 'a'.repeat(256),
    });
    expect(result).toEqual({ error: 'invalid slug', field: 'slug' });
  });

  it('should return error when title is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, { ...validData, title: '' });
    expect(result).toEqual({ error: 'invalid title', field: 'title' });
  });

  it('should return error when title exceeds 255 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      title: 'a'.repeat(256),
    });
    expect(result).toEqual({ error: 'invalid title', field: 'title' });
  });

  it('should return error when content is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, { ...validData, content: '' });
    expect(result).toEqual({ error: 'invalid content', field: 'content' });
  });

  it('should return error when locale is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, { ...validData, locale: '' });
    expect(result).toEqual({ error: 'invalid locale', field: 'locale' });
  });

  it('should return error when locale exceeds 10 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      locale: 'a'.repeat(11),
    });
    expect(result).toEqual({ error: 'invalid locale', field: 'locale' });
  });

  it('should return error when status is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, { ...validData, status: 'invalid' });
    expect(result).toEqual({ error: 'invalid status', field: 'status' });
  });

  it('should return error when status is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, { ...validData, status: '' });
    expect(result).toEqual({ error: 'invalid status', field: 'status' });
  });

  it('should return error when visibility is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      visibility: 'private',
    });
    expect(result).toEqual({ error: 'invalid visibility', field: 'visibility' });
  });

  it('should return error when visibility is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, { ...validData, visibility: '' });
    expect(result).toEqual({ error: 'invalid visibility', field: 'visibility' });
  });

  it('should return error when status is published and publishedAt is not set', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, {
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
    setupAdminWithAnnouncement();

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      status: 'published',
      publishedAt: '2024-06-15T12:00:00Z',
    });
    expect(result).toEqual({ success: true, id: announcementId });
  });

  it('should succeed when status is draft and publishedAt is not set', async () => {
    setupAdminWithAnnouncement();

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      status: 'draft',
      publishedAt: null,
    });
    expect(result).toEqual({ success: true, id: announcementId });
  });

  it('should succeed when status is draft and publishedAt is set', async () => {
    setupAdminWithAnnouncement();

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      status: 'draft',
      publishedAt: '2024-06-15T12:00:00Z',
    });
    expect(result).toEqual({ success: true, id: announcementId });
  });

  it('should accept members_only as a valid visibility', async () => {
    setupAdminWithAnnouncement();

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      visibility: 'members_only',
    });
    expect(result).toEqual({ success: true, id: announcementId });
  });

  it('should return not found when announcement does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([]);

    const result = await updateAnnouncement(announcementId, validData);
    expect(result).toEqual({ error: 'not found' });
  });

  it('should successfully update announcement with valid data', async () => {
    setupAdminWithAnnouncement();

    const result = await updateAnnouncement(announcementId, validData);
    expect(result).toEqual({ success: true, id: announcementId });
    expect(mockUpdateSetWhere).toHaveBeenCalled();
  });

  it('should trigger notification when sendNotification is true and status is published', async () => {
    setupAdminWithAnnouncement('draft');

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      status: 'published',
      slug: 'my-announcement',
      publishedAt: '2024-06-15T12:00:00Z',
      sendNotification: true,
    });
    expect(result).toEqual({ success: true, id: announcementId });
    expect(mockNotifyAllUsersOfAnnouncement).toHaveBeenCalledWith(
      announcementId,
      'my-announcement',
      'Updated Announcement'
    );
  });

  it('should NOT trigger notification when sendNotification is true but notification already exists', async () => {
    setupAdminWithAnnouncement('draft');
    mockHasAnnouncementNotification.mockResolvedValue(true);

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      status: 'published',
      slug: 'my-announcement',
      publishedAt: '2024-06-15T12:00:00Z',
      sendNotification: true,
    });
    expect(result).toEqual({ success: true, id: announcementId });
    expect(mockHasAnnouncementNotification).toHaveBeenCalledWith(announcementId);
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  it('should NOT trigger notification when status changes to published but sendNotification is false', async () => {
    setupAdminWithAnnouncement('draft');

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      status: 'published',
      publishedAt: '2024-06-15T12:00:00Z',
      sendNotification: false,
    });
    expect(result).toEqual({ success: true, id: announcementId });
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  it('should NOT trigger notification when status changes to published and sendNotification is omitted', async () => {
    setupAdminWithAnnouncement('draft');

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      status: 'published',
      publishedAt: '2024-06-15T12:00:00Z',
    });
    expect(result).toEqual({ success: true, id: announcementId });
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  it('should NOT trigger notification when status stays published', async () => {
    setupAdminWithAnnouncement('published');

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      status: 'published',
      publishedAt: '2024-06-15T12:00:00Z',
    });
    expect(result).toEqual({ success: true, id: announcementId });
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  it('should NOT trigger notification when status changes to draft', async () => {
    setupAdminWithAnnouncement('published');

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      status: 'draft',
    });
    expect(result).toEqual({ success: true, id: announcementId });
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  it('should NOT trigger notification when status stays draft', async () => {
    setupAdminWithAnnouncement('draft');

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      status: 'draft',
    });
    expect(result).toEqual({ success: true, id: announcementId });
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  it('should NOT trigger notification when sendNotification is true but status is draft', async () => {
    setupAdminWithAnnouncement('draft');

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      status: 'draft',
      sendNotification: true,
    });
    expect(result).toEqual({ success: true, id: announcementId });
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  it('should call revalidatePath after successful update', async () => {
    setupAdminWithAnnouncement();

    await updateAnnouncement(announcementId, validData);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/announcements');
  });

  it('should call revalidateTag("announcements") after successful update', async () => {
    setupAdminWithAnnouncement();

    await updateAnnouncement(announcementId, validData);
    expect(mockRevalidateTag).toHaveBeenCalledWith('announcements', { expire: 60 });
  });

  it('should not call revalidatePath when unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await updateAnnouncement(announcementId, validData);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('should not call revalidateTag when unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await updateAnnouncement(announcementId, validData);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('should not call revalidatePath when announcement not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValueOnce([{ role: 'admin' }]).mockReturnValueOnce([]);

    await updateAnnouncement(announcementId, validData);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('should not call revalidatePath when validation fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await updateAnnouncement(announcementId, { ...validData, slug: '' });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  // --- Edge case tests added by Tester ---

  it('should succeed when slug is exactly 255 characters', async () => {
    setupAdminWithAnnouncement();

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      slug: 'a'.repeat(255),
    });
    expect(result).toEqual({ success: true, id: announcementId });
  });

  it('should succeed when title is exactly 255 characters', async () => {
    setupAdminWithAnnouncement();

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      title: 'a'.repeat(255),
    });
    expect(result).toEqual({ success: true, id: announcementId });
  });

  it('should succeed when locale is exactly 10 characters', async () => {
    setupAdminWithAnnouncement();

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      locale: 'a'.repeat(10),
    });
    expect(result).toEqual({ success: true, id: announcementId });
  });

  it('should NOT trigger notification when published article is edited and saved as draft', async () => {
    setupAdminWithAnnouncement('published');

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      status: 'draft',
      title: 'Edited Published Article',
    });
    expect(result).toEqual({ success: true, id: announcementId });
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  it('should succeed with markdown special characters in content', async () => {
    setupAdminWithAnnouncement();

    const specialContent =
      '# Heading\n\n**bold** _italic_ ~~strike~~\n\n```code```\n\n| col1 | col2 |\n|------|------|\n| a    | b    |';
    const result = await updateAnnouncement(announcementId, {
      ...validData,
      content: specialContent,
    });
    expect(result).toEqual({ success: true, id: announcementId });
  });

  it('should succeed with very long content', async () => {
    setupAdminWithAnnouncement();

    const longContent = 'x'.repeat(100000);
    const result = await updateAnnouncement(announcementId, {
      ...validData,
      content: longContent,
    });
    expect(result).toEqual({ success: true, id: announcementId });
  });

  it('should succeed with unicode characters in title and content', async () => {
    setupAdminWithAnnouncement();

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      title: 'お知らせ更新 - Updated 🎉',
      content: '日本語のコンテンツです。\n\nEmoji: 🏁♟️👑',
    });
    expect(result).toEqual({ success: true, id: announcementId });
  });

  it('should not trigger notification and not call revalidatePath when publishedAt validation fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await updateAnnouncement(announcementId, {
      ...validData,
      status: 'published',
      publishedAt: null,
    });
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('should return the id in success response for existing announcement', async () => {
    setupAdminWithAnnouncement();

    const result = await updateAnnouncement(announcementId, validData);
    expect(result).toEqual({ success: true, id: announcementId });
    expect('id' in result && result.id).toBe(announcementId);
  });

  it('should trigger notification when sendNotification is true and published->published (not yet notified)', async () => {
    setupAdminWithAnnouncement('published');
    mockHasAnnouncementNotification.mockResolvedValue(false);

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      status: 'published',
      slug: 'already-published',
      publishedAt: '2024-06-15T12:00:00Z',
      sendNotification: true,
    });
    expect(result).toEqual({ success: true, id: announcementId });
    expect(mockHasAnnouncementNotification).toHaveBeenCalledWith(announcementId);
    expect(mockNotifyAllUsersOfAnnouncement).toHaveBeenCalledWith(
      announcementId,
      'already-published',
      'Updated Announcement'
    );
  });

  it('should NOT trigger notification when sendNotification is true and published->published but already notified', async () => {
    setupAdminWithAnnouncement('published');
    mockHasAnnouncementNotification.mockResolvedValue(true);

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      status: 'published',
      slug: 'already-published',
      publishedAt: '2024-06-15T12:00:00Z',
      sendNotification: true,
    });
    expect(result).toEqual({ success: true, id: announcementId });
    expect(mockHasAnnouncementNotification).toHaveBeenCalledWith(announcementId);
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  it('should not call hasAnnouncementNotification when sendNotification is false', async () => {
    setupAdminWithAnnouncement('draft');

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      status: 'published',
      publishedAt: '2024-06-15T12:00:00Z',
      sendNotification: false,
    });
    expect(result).toEqual({ success: true, id: announcementId });
    expect(mockHasAnnouncementNotification).not.toHaveBeenCalled();
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  it('should not call hasAnnouncementNotification when status is draft even with sendNotification true', async () => {
    setupAdminWithAnnouncement('draft');

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      status: 'draft',
      sendNotification: true,
    });
    expect(result).toEqual({ success: true, id: announcementId });
    expect(mockHasAnnouncementNotification).not.toHaveBeenCalled();
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  // --- Unique constraint violation handling ---

  it('should return friendly error on unique violation (code on error)', async () => {
    setupAdminWithAnnouncement('draft');

    const pgError = new Error(
      'duplicate key value violates unique constraint "uq_announcements_slug_locale"'
    );
    (pgError as unknown as Record<string, string>).code = '23505';
    mockUpdateSetWhere.mockImplementation(() => {
      throw pgError;
    });

    const result = await updateAnnouncement(announcementId, validData);
    expect(result).toEqual({ error: 'An announcement with this slug and locale already exists' });
  });

  it('should return friendly error on unique violation (code on cause)', async () => {
    setupAdminWithAnnouncement('draft');

    const cause = new Error(
      'duplicate key value violates unique constraint "uq_announcements_slug_locale"'
    );
    (cause as unknown as Record<string, string>).code = '23505';
    const wrappedError = new Error('Failed query: update "announcements"...', { cause });
    mockUpdateSetWhere.mockImplementation(() => {
      throw wrappedError;
    });

    const result = await updateAnnouncement(announcementId, validData);
    expect(result).toEqual({ error: 'An announcement with this slug and locale already exists' });
  });

  it('should rethrow non-unique-violation errors', async () => {
    setupAdminWithAnnouncement('draft');

    mockUpdateSetWhere.mockImplementation(() => {
      throw new Error('Connection failed');
    });

    await expect(updateAnnouncement(announcementId, validData)).rejects.toThrow(
      'Connection failed'
    );
  });

  it('should not call revalidateTag on unique violation', async () => {
    setupAdminWithAnnouncement('draft');

    const pgError = new Error('duplicate key value violates unique constraint');
    (pgError as unknown as Record<string, string>).code = '23505';
    mockUpdateSetWhere.mockImplementation(() => {
      throw pgError;
    });

    await updateAnnouncement(announcementId, validData);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('should not trigger notification on unique violation', async () => {
    setupAdminWithAnnouncement('draft');

    const pgError = new Error('duplicate key value violates unique constraint');
    (pgError as unknown as Record<string, string>).code = '23505';
    mockUpdateSetWhere.mockImplementation(() => {
      throw pgError;
    });

    await updateAnnouncement(announcementId, {
      ...validData,
      status: 'published',
      publishedAt: '2024-06-15T12:00:00Z',
      sendNotification: true,
    });
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });
});
