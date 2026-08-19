import { describe, expect, it, vi } from 'vitest';

import { whereThenLimit } from '@/lib/db/__test-support__/query-chain';
import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';

import { deleteAnnouncement } from './deleteAnnouncement';

const mockSelectFromWhere = vi.fn();
const mockDeleteWhere = vi.fn();
const mockRevalidatePath = vi.fn();
const mockRevalidateTag = vi.fn();

vi.mock('@/lib/supabase/server');

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: whereThenLimit(mockSelectFromWhere),
      }),
    }),
    delete: () => ({
      where: mockDeleteWhere,
    }),
  },
  announcements: {
    id: 'id',
  },
  userRoles: { userId: 'user_id' },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

const adminUserId = 'admin-00000000-0000-0000-0000-000000000001';
const announcementId = 'ann-00000000-0000-0000-0000-000000000001';

describe('deleteAnnouncement', () => {
  it('should return unauthorized when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await deleteAnnouncement(announcementId);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return unauthorized when user is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'user' }]);

    const result = await deleteAnnouncement(announcementId);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should return unauthorized when no userRole record exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([]);

    const result = await deleteAnnouncement(announcementId);
    expect(result).toEqual({ error: 'unauthorized' });
  });

  it('should successfully delete announcement', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await deleteAnnouncement(announcementId);
    expect(result).toEqual({ success: true });
    expect(mockDeleteWhere).toHaveBeenCalled();
  });

  it('should call revalidatePath after successful deletion', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await deleteAnnouncement(announcementId);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/announcements');
  });

  it('should call revalidateTag("announcements") after successful deletion', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    await deleteAnnouncement(announcementId);
    expect(mockRevalidateTag).toHaveBeenCalledWith('announcements', { expire: 60 });
  });

  it('should not call revalidatePath when unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await deleteAnnouncement(announcementId);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('should not call revalidateTag when unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await deleteAnnouncement(announcementId);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('should return success even when announcement ID does not exist (no-op delete)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);

    const result = await deleteAnnouncement('nonexistent-id');
    expect(result).toEqual({ success: true });
    expect(mockDeleteWhere).toHaveBeenCalled();
  });
});
