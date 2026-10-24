import { beforeEach, describe, expect, it, vi } from 'vitest';

import { decideJoinAnnouncement } from './decideJoinAnnouncement';

const mockRecord = vi.fn();
vi.mock('@/lib/feed-items/member-joined-mutations', () => ({
  decideJoinAnnouncement: (...args: unknown[]) => mockRecord(...args),
}));

const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  authenticateCheckBanAndRequireProfile: () => mockAuth(),
}));

vi.mock('@/lib/server-action-error', () => ({
  handleServerActionError: () => ({ success: false, error: 'unexpected_error' }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: 'member-1' } });
});

describe('decideJoinAnnouncement', () => {
  it.each([true, false])('records announce=%s for the signed-in member', async (announce) => {
    mockRecord.mockResolvedValue(true);

    expect(await decideJoinAnnouncement({ announce })).toEqual({ success: true });
    expect(mockRecord).toHaveBeenCalledWith('member-1', announce);
  });

  it('reports alreadyDecided when the answer was recorded before', async () => {
    mockRecord.mockResolvedValue(false);

    expect(await decideJoinAnnouncement({ announce: true })).toEqual({ error: 'alreadyDecided' });
  });

  it('treats anything but a literal true as declining', async () => {
    mockRecord.mockResolvedValue(true);

    await decideJoinAnnouncement({ announce: 'yes' as unknown as boolean });
    expect(mockRecord).toHaveBeenCalledWith('member-1', false);
  });

  it('maps a ban to banned, a missing profile to profileRequired, anything else to signInRequired', async () => {
    mockAuth.mockResolvedValueOnce({ error: 'banned' });
    expect(await decideJoinAnnouncement({ announce: true })).toEqual({ error: 'banned' });

    mockAuth.mockResolvedValueOnce({ error: 'profileRequired' });
    expect(await decideJoinAnnouncement({ announce: true })).toEqual({ error: 'profileRequired' });

    mockAuth.mockResolvedValueOnce({ error: 'unauthenticated' });
    expect(await decideJoinAnnouncement({ announce: true })).toEqual({ error: 'signInRequired' });
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('returns unexpected_error when recording throws', async () => {
    mockRecord.mockRejectedValue(new Error('db down'));

    expect(await decideJoinAnnouncement({ announce: true })).toEqual({
      error: 'unexpected_error',
    });
  });
});
