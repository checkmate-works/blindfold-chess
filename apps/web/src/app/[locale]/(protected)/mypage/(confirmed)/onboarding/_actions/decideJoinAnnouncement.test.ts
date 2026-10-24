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
  it.each([
    [true, 'announced'],
    [false, 'declined'],
  ] as const)('records announce=%s for the signed-in member', async (announce, outcome) => {
    mockRecord.mockResolvedValue({ recorded: true, outcome });

    expect(await decideJoinAnnouncement({ announce })).toEqual({ success: true, outcome });
    expect(mockRecord).toHaveBeenCalledWith('member-1', announce);
  });

  it('returns the outcome already on record when the answer was recorded before', async () => {
    // The caller pressed "don't post", but another tab had already posted:
    // the step must say "posted", so the recorded outcome wins.
    mockRecord.mockResolvedValue({ recorded: false, outcome: 'announced' });

    expect(await decideJoinAnnouncement({ announce: false })).toEqual({
      success: true,
      outcome: 'announced',
    });
  });

  it('treats anything but a literal true as declining', async () => {
    mockRecord.mockResolvedValue({ recorded: true, outcome: 'declined' });

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
