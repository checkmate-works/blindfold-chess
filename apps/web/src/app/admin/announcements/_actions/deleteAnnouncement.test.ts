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
const mockMoveLikes = vi.fn();

vi.mock('@/lib/supabase/server');

vi.mock('@/lib/db/announcement-likes', () => ({
  moveLikesOffVariantBeingDeleted: (...args: unknown[]) => mockMoveLikes(...args),
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
    expect(mockDeleteWhere).toHaveBeenCalled();
  });

  it('re-homes the variant likes before the row is deleted', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: adminUserId } } });
    mockSelectFromWhere.mockReturnValue([{ role: 'admin' }]);
    mockMoveLikes.mockClear();
    mockDeleteWhere.mockClear();

    await deleteAnnouncement(announcementId);
    expect(mockMoveLikes).toHaveBeenCalledWith(announcementId);
    expect(mockMoveLikes.mock.invocationCallOrder[0]).toBeLessThan(
      mockDeleteWhere.mock.invocationCallOrder[0]
    );
  });

  it('does not touch likes when unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockMoveLikes.mockClear();

    await deleteAnnouncement(announcementId);
    expect(mockMoveLikes).not.toHaveBeenCalled();
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
