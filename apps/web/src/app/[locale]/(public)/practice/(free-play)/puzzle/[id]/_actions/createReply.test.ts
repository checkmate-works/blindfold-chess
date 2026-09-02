import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isUserBanned as mockIsUserBanned } from '@/lib/moderation/__mocks__/ban';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';

import { createReply } from './createReply';

const mockSelectFromWhere = vi.fn();
const mockSelectProfile = vi.fn();
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn();
const mockGetPositionById = vi.fn();

vi.mock('@/lib/moderation/block');

vi.mock('@/lib/users/activity-log');

vi.mock('@/lib/notifications/notification');

vi.mock('@/lib/supabase/server');

vi.mock('@/lib/db', async () => {
  const { topicReplyDbMock } = await import('@/lib/db/__test-support__/topic-reply-db-mock');

  return topicReplyDbMock(() => ({
    selectFromWhere: mockSelectFromWhere,
    selectProfile: mockSelectProfile,
    insertValues: mockInsertValues,
    insertReturning: mockInsertReturning,
  }));
});

vi.mock('@/lib/moderation/ban');

vi.mock('@/lib/security/rate-limit');

vi.mock('next/navigation');

vi.mock('@/lib/positions/queries', () => ({
  getPositionById: (params: { id: string; type: string }) => mockGetPositionById(params),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const otherUserId = 'user-00000000-0000-0000-0000-000000000002';
const validPostId = '00000000-0000-0000-0000-000000000020';
const generatedReplyId = 'reply-00000000-0000-0000-0000-000000000020';
const positionId = '00000000-0000-0000-0000-000000000088';

function makeFormData(content: string, options: { isSpoiler?: string } = {}): FormData {
  const fd = new FormData();
  fd.set('content', content);
  if (options.isSpoiler !== undefined) {
    fd.set('isSpoiler', options.isSpoiler);
  }
  return fd;
}

describe('puzzle parent-page createReply', () => {
  beforeEach(() => {
    mockGetPositionById.mockResolvedValue({ id: positionId, type: 'puzzle' });
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true });
    mockSelectProfile.mockResolvedValue([{ id: testUserId }]);
    mockSelectFromWhere.mockReturnValue([
      { id: validPostId, userId: otherUserId, replyPermission: 'everyone' },
    ]);
    mockInsertReturning.mockResolvedValue([{ id: generatedReplyId }]);
  });

  it('inserts reply with topicType=position_puzzle and topicKey=positionId', async () => {
    await expect(
      createReply('en', positionId, validPostId, {}, makeFormData('a reply'))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        topicType: 'position_puzzle',
        topicKey: positionId,
        content: 'a reply',
      })
    );
  });

  it('returns profileRequired and does not insert when the user has no profile', async () => {
    mockSelectProfile.mockResolvedValue([]);

    const result = await createReply('en', positionId, validPostId, {}, makeFormData('a reply'));
    expect(result).toEqual({ error: 'profileRequired' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('persists isSpoiler=true when the form sends `isSpoiler=on` (puzzle reply may contain solution)', async () => {
    await expect(
      createReply('en', positionId, validPostId, {}, makeFormData('reveal!', { isSpoiler: 'on' }))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({ isSpoiler: true }));
  });

  it('persists isSpoiler=false when the checkbox is omitted (forged value never silently flags)', async () => {
    await expect(
      createReply('en', positionId, validPostId, {}, makeFormData('plain'))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({ isSpoiler: false }));
  });

  it('redirects back to the parent puzzle page with #post-{newReplyId} anchor', async () => {
    await expect(
      createReply('ja', positionId, validPostId, {}, makeFormData('hi'))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(vi.mocked(redirect)).toHaveBeenCalledWith(
      `/ja/practice/puzzle/${positionId}?toast=post_created#post-${generatedReplyId}`
    );
  });

  // No revalidation: the redirect above lands on the (dynamic) parent puzzle
  // page, which re-queries and shows the new reply in the inline tree.
  it('does not revalidate any path', async () => {
    await expect(
      createReply('en', positionId, validPostId, {}, makeFormData('hi'))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
