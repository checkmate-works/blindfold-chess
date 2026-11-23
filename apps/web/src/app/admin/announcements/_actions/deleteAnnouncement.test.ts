import {
  revalidatePath as mockRevalidatePath,
  revalidateTag as mockRevalidateTag,
} from 'next/cache';

import { describe, expect, it, vi } from 'vitest';

import { whereThenLimit } from '@/lib/db/__test-support__/query-chain';
import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';
import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';

import { deleteAnnouncement } from './deleteAnnouncement';

const mockSelectFromWhere = vi.fn();
const mockDeleteWhere = vi.fn();
const mockDeleteWithLikes = vi.fn();

vi.mock('@/lib/supabase/server');

vi.mock('@/lib/db/announcement-likes', () => ({
  deleteAnnouncementWithLikes: (...args: unknown[]) => mockDeleteWithLikes(...args),
}));

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
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
    expect(mockDeleteWithLikes).toHaveBeenCalled();
  });

  it('delegates the whole deletion to the transactional helper', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);
    await deleteAnnouncement(announcementId);
    expect(mockDeleteWithLikes).toHaveBeenCalledWith(announcementId);
    expect(mockDeleteWhere).not.toHaveBeenCalled();
  });

  it('does not touch likes when unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockDeleteWithLikes.mockClear();

    await deleteAnnouncement(announcementId);
    expect(mockDeleteWithLikes).not.toHaveBeenCalled();
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
    expect(mockDeleteWithLikes).toHaveBeenCalled();
  });
  it('does not invalidate caches when transactional deletion fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);
    mockDeleteWithLikes.mockRejectedValueOnce(new Error('delete failed'));
    await expect(deleteAnnouncement(announcementId)).rejects.toThrow('delete failed');
    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });
});
