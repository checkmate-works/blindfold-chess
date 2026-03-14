import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateAnnouncement } from './updateAnnouncement';

const mockGetUser = vi.fn();
const mockSelectFromWhere = vi.fn();
const mockUpdateSetWhere = vi.fn();
const mockRevalidatePath = vi.fn();
const mockNotifyAllUsersOfAnnouncement = vi.fn();

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
}));

vi.mock('@/lib/announcement-notification', () => ({
  notifyAllUsersOfAnnouncement: (...args: unknown[]) => mockNotifyAllUsersOfAnnouncement(...args),
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
    expect(result).toEqual({ error: 'invalid slug' });
  });

  it('should return error when slug exceeds 255 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      slug: 'a'.repeat(256),
    });
    expect(result).toEqual({ error: 'invalid slug' });
  });

  it('should return error when title is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, { ...validData, title: '' });
    expect(result).toEqual({ error: 'invalid title' });
  });

  it('should return error when title exceeds 255 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      title: 'a'.repeat(256),
    });
    expect(result).toEqual({ error: 'invalid title' });
  });

  it('should return error when content is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, { ...validData, content: '' });
    expect(result).toEqual({ error: 'invalid content' });
  });

  it('should return error when locale is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, { ...validData, locale: '' });
    expect(result).toEqual({ error: 'invalid locale' });
  });

  it('should return error when locale exceeds 10 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      locale: 'a'.repeat(11),
    });
    expect(result).toEqual({ error: 'invalid locale' });
  });

  it('should return error when status is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, { ...validData, status: 'invalid' });
    expect(result).toEqual({ error: 'invalid status' });
  });

  it('should return error when status is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, { ...validData, status: '' });
    expect(result).toEqual({ error: 'invalid status' });
  });

  it('should return error when visibility is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      visibility: 'private',
    });
    expect(result).toEqual({ error: 'invalid visibility' });
  });

  it('should return error when visibility is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await updateAnnouncement(announcementId, { ...validData, visibility: '' });
    expect(result).toEqual({ error: 'invalid visibility' });
  });

  it('should accept members_only as a valid visibility', async () => {
    setupAdminWithAnnouncement();

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      visibility: 'members_only',
    });
    expect(result).toEqual({ success: true });
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
    expect(result).toEqual({ success: true });
    expect(mockUpdateSetWhere).toHaveBeenCalled();
  });

  it('should trigger notification when status changes to published', async () => {
    setupAdminWithAnnouncement('draft');

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      status: 'published',
      slug: 'my-announcement',
    });
    expect(result).toEqual({ success: true });
    expect(mockNotifyAllUsersOfAnnouncement).toHaveBeenCalledWith(
      announcementId,
      'my-announcement',
      'Updated Announcement'
    );
  });

  it('should NOT trigger notification when status stays published', async () => {
    setupAdminWithAnnouncement('published');

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      status: 'published',
    });
    expect(result).toEqual({ success: true });
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  it('should NOT trigger notification when status changes to draft', async () => {
    setupAdminWithAnnouncement('published');

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      status: 'draft',
    });
    expect(result).toEqual({ success: true });
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  it('should NOT trigger notification when status stays draft', async () => {
    setupAdminWithAnnouncement('draft');

    const result = await updateAnnouncement(announcementId, {
      ...validData,
      status: 'draft',
    });
    expect(result).toEqual({ success: true });
    expect(mockNotifyAllUsersOfAnnouncement).not.toHaveBeenCalled();
  });

  it('should call revalidatePath after successful update', async () => {
    setupAdminWithAnnouncement();

    await updateAnnouncement(announcementId, validData);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/announcements');
  });

  it('should not call revalidatePath when unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await updateAnnouncement(announcementId, validData);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
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
});
