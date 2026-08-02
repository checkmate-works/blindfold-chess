import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProfileFeed } from './getProfileFeed';

const mockGetUser = vi.fn();
const mockGetFeedData = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { getUser: mockGetUser } }),
}));

vi.mock('@/app/[locale]/(public)/(home)/_lib/queries', () => ({
  getFeedData: (...args: unknown[]) => mockGetFeedData(...args),
}));

const PROFILE_ID = '00000000-0000-4000-8000-000000000001';
const EMPTY = { items: [], nextCursor: null };

describe('getProfileFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockGetFeedData.mockResolvedValue(EMPTY);
  });

  describe('profileId validation', () => {
    it('should return an empty page for a non-UUID profile id', async () => {
      const result = await getProfileFeed('not-a-uuid');

      expect(result).toEqual(EMPTY);
      expect(mockGetFeedData).not.toHaveBeenCalled();
    });

    it('should return an empty page for a SQL-ish profile id', async () => {
      const result = await getProfileFeed("' OR 1=1--");

      expect(result).toEqual(EMPTY);
      expect(mockGetFeedData).not.toHaveBeenCalled();
    });

    it('should scope the feed to the profile when the id is a UUID', async () => {
      await getProfileFeed(PROFILE_ID);

      expect(mockGetFeedData).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: PROFILE_ID })
      );
    });
  });

  describe('cursor validation', () => {
    it('should return an empty page for an invalid cursor', async () => {
      const result = await getProfileFeed(PROFILE_ID, 'not-a-date');

      expect(result).toEqual(EMPTY);
      expect(mockGetFeedData).not.toHaveBeenCalled();
    });

    it('should pass a valid ISO cursor through', async () => {
      const cursor = '2025-01-15T10:00:00.000Z';

      await getProfileFeed(PROFILE_ID, cursor);

      expect(mockGetFeedData).toHaveBeenCalledWith(expect.objectContaining({ cursor }));
    });
  });

  describe('filter whitelist', () => {
    it('should apply no entity-type filter for the default (all) filter', async () => {
      await getProfileFeed(PROFILE_ID);

      expect(mockGetFeedData).toHaveBeenCalledWith(
        expect.objectContaining({ entityTypes: undefined })
      );
    });

    it('should resolve a known filter to its entity types', async () => {
      await getProfileFeed(PROFILE_ID, undefined, 'games');

      expect(mockGetFeedData).toHaveBeenCalledWith(
        expect.objectContaining({ entityTypes: ['game'] })
      );
    });

    it('should fall back to the unfiltered timeline for an unknown filter', async () => {
      await getProfileFeed(PROFILE_ID, undefined, 'challenge_rank_update');

      expect(mockGetFeedData).toHaveBeenCalledWith(
        expect.objectContaining({ entityTypes: undefined })
      );
    });

    it('should never forward a client-supplied entity type verbatim', async () => {
      await getProfileFeed(PROFILE_ID, undefined, "'; DROP TABLE feed_items;--");

      expect(mockGetFeedData).toHaveBeenCalledWith(
        expect.objectContaining({ entityTypes: undefined })
      );
    });
  });

  describe('viewer context', () => {
    it('should pass the viewer id when authenticated', async () => {
      const viewerId = '00000000-0000-4000-8000-0000000000ff';
      mockGetUser.mockResolvedValue({ data: { user: { id: viewerId } } });

      await getProfileFeed(PROFILE_ID);

      expect(mockGetFeedData).toHaveBeenCalledWith(
        expect.objectContaining({ currentUserId: viewerId, actorId: PROFILE_ID })
      );
    });

    it('should pass an undefined viewer id when anonymous', async () => {
      await getProfileFeed(PROFILE_ID);

      expect(mockGetFeedData).toHaveBeenCalledWith(
        expect.objectContaining({ currentUserId: undefined })
      );
    });
  });

  it('should return the result from getFeedData', async () => {
    const expected = { items: [], nextCursor: '2025-01-15T09:00:00.000Z' };
    mockGetFeedData.mockResolvedValue(expected);

    await expect(getProfileFeed(PROFILE_ID)).resolves.toEqual(expected);
  });
});
