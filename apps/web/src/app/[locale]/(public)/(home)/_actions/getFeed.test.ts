import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getFeed } from './getFeed';

const mockGetUser = vi.fn();
const mockGetFeedData = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    }),
}));

vi.mock('../_lib/queries', () => ({
  getFeedData: (...args: unknown[]) => mockGetFeedData(...args),
}));

describe('getFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  describe('cursor validation', () => {
    it('should return empty result for invalid cursor string', async () => {
      const result = await getFeed('not-a-date');

      expect(result).toEqual({ items: [], nextCursor: null });
      expect(mockGetFeedData).not.toHaveBeenCalled();
    });

    it('should return empty result for non-ISO cursor string', async () => {
      const result = await getFeed('abc123');

      expect(result).toEqual({ items: [], nextCursor: null });
      expect(mockGetFeedData).not.toHaveBeenCalled();
    });

    it('should call getFeedData when cursor is a valid ISO date', async () => {
      const validCursor = '2025-01-15T10:00:00.000Z';
      mockGetFeedData.mockResolvedValue({ items: [], nextCursor: null });

      await getFeed(validCursor);

      expect(mockGetFeedData).toHaveBeenCalledWith(validCursor, 10, undefined);
    });

    it('should call getFeedData when cursor is undefined (first page)', async () => {
      mockGetFeedData.mockResolvedValue({ items: [], nextCursor: null });

      await getFeed(undefined);

      expect(mockGetFeedData).toHaveBeenCalledWith(undefined, 10, undefined);
    });
  });

  describe('limit clamping', () => {
    it('should use default limit of 10 when limit is not provided', async () => {
      mockGetFeedData.mockResolvedValue({ items: [], nextCursor: null });

      await getFeed(undefined, undefined);

      expect(mockGetFeedData).toHaveBeenCalledWith(undefined, 10, undefined);
    });

    it('should pass limit as-is when it is within range', async () => {
      mockGetFeedData.mockResolvedValue({ items: [], nextCursor: null });

      await getFeed(undefined, 25);

      expect(mockGetFeedData).toHaveBeenCalledWith(undefined, 25, undefined);
    });

    it('should clamp limit to 50 when limit exceeds MAX_FEED_LIMIT', async () => {
      mockGetFeedData.mockResolvedValue({ items: [], nextCursor: null });

      await getFeed(undefined, 100);

      expect(mockGetFeedData).toHaveBeenCalledWith(undefined, 50, undefined);
    });

    it('should clamp limit to 50 when limit is exactly 51', async () => {
      mockGetFeedData.mockResolvedValue({ items: [], nextCursor: null });

      await getFeed(undefined, 51);

      expect(mockGetFeedData).toHaveBeenCalledWith(undefined, 50, undefined);
    });

    it('should use 50 when limit is exactly 50', async () => {
      mockGetFeedData.mockResolvedValue({ items: [], nextCursor: null });

      await getFeed(undefined, 50);

      expect(mockGetFeedData).toHaveBeenCalledWith(undefined, 50, undefined);
    });
  });

  describe('user context', () => {
    it('should pass user id to getFeedData when user is authenticated', async () => {
      const userId = 'user-00000000-0000-0000-0000-000000000001';
      mockGetUser.mockResolvedValue({ data: { user: { id: userId } } });
      mockGetFeedData.mockResolvedValue({ items: [], nextCursor: null });

      await getFeed(undefined);

      expect(mockGetFeedData).toHaveBeenCalledWith(undefined, 10, userId);
    });

    it('should pass undefined user id when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      mockGetFeedData.mockResolvedValue({ items: [], nextCursor: null });

      await getFeed(undefined);

      expect(mockGetFeedData).toHaveBeenCalledWith(undefined, 10, undefined);
    });
  });

  describe('return value', () => {
    it('should return the result from getFeedData', async () => {
      const expectedResult = {
        items: [
          {
            id: 'feed-1',
            entityType: 'topic_post' as const,
            entityId: 'post-1',
            actorId: 'user-1',
            createdAt: '2025-01-15T10:00:00.000Z',
            data: {} as never,
          },
        ],
        nextCursor: '2025-01-15T09:00:00.000Z',
      };
      mockGetFeedData.mockResolvedValue(expectedResult);

      const result = await getFeed(undefined);

      expect(result).toEqual(expectedResult);
    });

    it('should return empty items and null nextCursor when no items exist', async () => {
      mockGetFeedData.mockResolvedValue({ items: [], nextCursor: null });

      const result = await getFeed(undefined);

      expect(result).toEqual({ items: [], nextCursor: null });
    });
  });
});
