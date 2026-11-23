import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  authenticateAndGuard as mockAuthenticateAndGuard,
  userHasProfile,
} from '@/lib/__mocks__/auth';

import { toggleAnnouncementLikeAction } from './toggleAnnouncementLike';

const mockGetPublished = vi.fn();
const mockToggle = vi.fn();
const mockLogActivity = vi.fn();

vi.mock('@/lib/auth');

vi.mock('@/app/[locale]/(public)/announcements/_lib/queries', () => ({
  getPublishedAnnouncement: (...args: unknown[]) => mockGetPublished(...args),
}));

vi.mock('@/lib/db/announcement-likes', () => ({
  ANNOUNCEMENT_LIKE_TARGET: 'announcement',
  toggleAnnouncementLike: (...args: unknown[]) => mockToggle(...args),
}));

vi.mock('@/lib/users/activity-log', () => ({
  logActivityEvent: (...args: unknown[]) => mockLogActivity(...args),
}));

const USER_ID = 'user-00000000-0000-0000-0000-000000000001';
const JA_VARIANT_ID = '11111111-2222-3333-4444-555555555555';

describe('toggleAnnouncementLikeAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: USER_ID } });
    mockGetPublished.mockResolvedValue({
      announcement: { id: JA_VARIANT_ID, slug: 'coin-retirement' },
      availableLocales: ['en', 'ja'],
    });
    mockToggle.mockResolvedValue({ liked: true, likeCount: 4 });
  });

  it('likes the variant the reader was shown and returns the slug-wide count', async () => {
    const result = await toggleAnnouncementLikeAction('coin-retirement', 'ja');

    expect(result).toEqual({ success: true, liked: true, likeCount: 4 });
    expect(mockGetPublished).toHaveBeenCalledWith('coin-retirement', 'ja');
    expect(mockToggle).toHaveBeenCalledWith({
      userId: USER_ID,
      slug: 'coin-retirement',
      displayedVariantId: JA_VARIANT_ID,
    });
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'like', targetType: 'announcement' })
    );
  });

  it('passes a guest through to signInRequired without touching likes', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const result = await toggleAnnouncementLikeAction('coin-retirement', 'ja');

    expect(result).toEqual({ error: 'signInRequired' });
    expect(mockToggle).not.toHaveBeenCalled();
  });

  it('refuses a slug with no published variant (draft or unknown)', async () => {
    mockGetPublished.mockResolvedValue(null);

    const result = await toggleAnnouncementLikeAction('draft-only', 'en');

    expect(result).toEqual({ error: 'notFound' });
    expect(mockToggle).not.toHaveBeenCalled();
  });
  it.each(['banned', 'rateLimited'])('rejects %s before reading the notice', async (error) => {
    mockAuthenticateAndGuard.mockResolvedValue({ error });
    expect(await toggleAnnouncementLikeAction('notice', 'en')).toEqual({ error });
    expect(mockGetPublished).not.toHaveBeenCalled();
    expect(mockToggle).not.toHaveBeenCalled();
  });

  it('requires a completed profile', async () => {
    userHasProfile.mockResolvedValueOnce(false);
    expect(await toggleAnnouncementLikeAction('notice', 'en')).toEqual({
      error: 'profileRequired',
    });
    expect(mockToggle).not.toHaveBeenCalled();
  });

  it('does not log a like when the variant disappeared after the public lookup', async () => {
    mockToggle.mockResolvedValue({ error: 'notFound' });
    expect(await toggleAnnouncementLikeAction('notice', 'en')).toEqual({ error: 'notFound' });
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it.each(['', 'a'.repeat(256)])('rejects an invalid slug without querying', async (slug) => {
    expect(await toggleAnnouncementLikeAction(slug, 'en')).toEqual({ error: 'notFound' });
    expect(mockGetPublished).not.toHaveBeenCalled();
  });

  it('rejects unsupported locales before authenticating', async () => {
    expect(await toggleAnnouncementLikeAction('notice', 'invalid')).toHaveProperty('error');
    expect(mockAuthenticateAndGuard).not.toHaveBeenCalled();
    expect(mockToggle).not.toHaveBeenCalled();
  });

  it('allows a registered reader to react to a members-only notice', async () => {
    mockGetPublished.mockResolvedValue({
      announcement: { id: JA_VARIANT_ID, visibility: 'members_only' },
    });
    expect(await toggleAnnouncementLikeAction('notice', 'ja')).toEqual({
      success: true,
      liked: true,
      likeCount: 4,
    });
  });
});
