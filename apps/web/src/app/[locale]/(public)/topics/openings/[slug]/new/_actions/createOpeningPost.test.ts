import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logActivityEvent } from '@/lib/activity-log';

import { createOpeningPost } from './createOpeningPost';

const mockGetUser = vi.fn();
const mockInsertValues = vi.fn();
const mockInsertReturning = vi.fn();
const mockIsUserBanned = vi.fn();
const mockIsValidOpening = vi.fn();

vi.mock('@/lib/activity-log', () => ({
  logActivityEvent: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    }),
}));

const generatedPostId = 'post-00000000-0000-0000-0000-000000000001';

const mockTx = {
  insert: () => ({
    values: (...args: unknown[]) => {
      mockInsertValues(...args);
      return {
        returning: () => mockInsertReturning(),
      };
    },
  }),
};

vi.mock('@/lib/db', () => ({
  db: {
    transaction: (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
  },
  topicPosts: {
    id: 'id',
  },
  topicPostRatings: {},
}));

vi.mock('@/lib/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

const mockCheckRateLimit = vi.fn().mockResolvedValue({ success: true });

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  createOpeningPostRateLimit: (slug: string) => ({
    action: `create_opening_post:${slug}`,
    maxAttempts: 1,
    windowMs: 86_400_000,
  }),
}));

vi.mock('../../../_lib/queries', () => ({
  isValidOpening: (...args: unknown[]) => mockIsValidOpening(...args),
}));

const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error('NEXT_REDIRECT');
  },
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';

function makeFormData(fields: {
  content?: string;
  preferenceRating?: string;
  proficiencyRating?: string;
}): FormData {
  const fd = new FormData();
  if (fields.content !== undefined) fd.set('content', fields.content);
  if (fields.preferenceRating !== undefined) fd.set('preferenceRating', fields.preferenceRating);
  if (fields.proficiencyRating !== undefined) fd.set('proficiencyRating', fields.proficiencyRating);
  return fd;
}

describe('createOpeningPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsValidOpening.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockInsertReturning.mockResolvedValue([{ id: generatedPostId }]);
    mockCheckRateLimit.mockResolvedValue({ success: true });
  });

  describe('opening validation', () => {
    it('should return error for invalid opening slug', async () => {
      mockIsValidOpening.mockResolvedValue(false);

      const result = await createOpeningPost(
        'en',
        'nonexistent-opening',
        {},
        makeFormData({ content: 'hello' })
      );
      expect(result).toEqual({ error: 'invalidOpening' });
      expect(mockGetUser).not.toHaveBeenCalled();
    });
  });

  describe('authentication', () => {
    it('should return signInRequired when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await createOpeningPost(
        'en',
        'french-defense',
        {},
        makeFormData({ content: 'hello' })
      );
      expect(result).toEqual({ error: 'signInRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });
  });

  describe('ban enforcement', () => {
    it('should return banned when user is banned', async () => {
      mockIsUserBanned.mockResolvedValue(true);

      const result = await createOpeningPost(
        'en',
        'french-defense',
        {},
        makeFormData({ content: 'hello' })
      );
      expect(result).toEqual({ error: 'banned' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });
  });

  describe('content and rating validation', () => {
    it('should return contentOrRatingRequired when neither content nor ratings are provided', async () => {
      const result = await createOpeningPost(
        'en',
        'french-defense',
        {},
        makeFormData({ content: '' })
      );
      expect(result).toEqual({ error: 'contentOrRatingRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should return contentOrRatingRequired when content is whitespace only and no ratings', async () => {
      const result = await createOpeningPost(
        'en',
        'french-defense',
        {},
        makeFormData({ content: '   ' })
      );
      expect(result).toEqual({ error: 'contentOrRatingRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should return contentTooLong when content exceeds 5000 characters', async () => {
      const longContent = 'a'.repeat(5001);
      const result = await createOpeningPost(
        'en',
        'french-defense',
        {},
        makeFormData({ content: longContent })
      );
      expect(result).toEqual({ error: 'contentTooLong' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('should accept ratings without content', async () => {
      await expect(
        createOpeningPost('en', 'french-defense', {}, makeFormData({ preferenceRating: '4' }))
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockInsertValues).toHaveBeenCalledTimes(2);
    });

    it('should accept content without ratings', async () => {
      await expect(
        createOpeningPost('en', 'french-defense', {}, makeFormData({ content: 'Great opening!' }))
      ).rejects.toThrow('NEXT_REDIRECT');

      // Only topic_posts insert, no ratings insert
      expect(mockInsertValues).toHaveBeenCalledTimes(1);
    });

    it('should accept both content and ratings', async () => {
      await expect(
        createOpeningPost(
          'en',
          'french-defense',
          {},
          makeFormData({
            content: 'Great opening!',
            preferenceRating: '5',
            proficiencyRating: '3',
          })
        )
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockInsertValues).toHaveBeenCalledTimes(2);
    });

    it('should ignore invalid rating values', async () => {
      const result = await createOpeningPost(
        'en',
        'french-defense',
        {},
        makeFormData({ preferenceRating: '6' })
      );
      // Rating 6 is invalid (out of 1-5 range), and no content, so error
      expect(result).toEqual({ error: 'contentOrRatingRequired' });
    });

    it('should ignore non-numeric rating values', async () => {
      const result = await createOpeningPost(
        'en',
        'french-defense',
        {},
        makeFormData({ preferenceRating: 'abc' })
      );
      expect(result).toEqual({ error: 'contentOrRatingRequired' });
    });
  });

  describe('successful post creation', () => {
    it('should insert post with content and redirect', async () => {
      await expect(
        createOpeningPost(
          'en',
          'french-defense',
          {},
          makeFormData({ content: 'I love this opening' })
        )
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: testUserId,
        topicType: 'opening',
        topicKey: 'french-defense',
        content: 'I love this opening',
      });

      expect(mockRedirect).toHaveBeenCalledWith(
        '/en/topics/openings/french-defense?toast=post_created'
      );
    });

    it('should insert post with empty content when only ratings provided', async () => {
      await expect(
        createOpeningPost(
          'en',
          'french-defense',
          {},
          makeFormData({ preferenceRating: '4', proficiencyRating: '2' })
        )
      ).rejects.toThrow('NEXT_REDIRECT');

      // First call: topic_posts with empty content
      expect(mockInsertValues).toHaveBeenNthCalledWith(1, {
        userId: testUserId,
        topicType: 'opening',
        topicKey: 'french-defense',
        content: '',
      });

      // Second call: topic_post_ratings
      expect(mockInsertValues).toHaveBeenNthCalledWith(2, {
        postId: generatedPostId,
        preferenceRating: 4,
        proficiencyRating: 2,
      });
    });

    it('should redirect to correct locale', async () => {
      await expect(
        createOpeningPost('ja', 'sicilian-defense', {}, makeFormData({ content: 'post' }))
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockRedirect).toHaveBeenCalledWith(
        '/ja/topics/openings/sicilian-defense?toast=post_created'
      );
    });
  });

  describe('validation order (rate limit after validation)', () => {
    it('should NOT consume rate limit when content and ratings are both empty', async () => {
      const result = await createOpeningPost(
        'en',
        'french-defense',
        {},
        makeFormData({ content: '' })
      );
      expect(result).toEqual({ error: 'contentOrRatingRequired' });
      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });

    it('should NOT consume rate limit when content exceeds max length', async () => {
      const longContent = 'a'.repeat(5001);
      const result = await createOpeningPost(
        'en',
        'french-defense',
        {},
        makeFormData({ content: longContent })
      );
      expect(result).toEqual({ error: 'contentTooLong' });
      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });

    it('should NOT consume rate limit when opening is invalid', async () => {
      mockIsValidOpening.mockResolvedValue(false);
      const result = await createOpeningPost(
        'en',
        'nonexistent-opening',
        {},
        makeFormData({ content: 'hello' })
      );
      expect(result).toEqual({ error: 'invalidOpening' });
      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });

    it('should NOT consume rate limit when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const result = await createOpeningPost(
        'en',
        'french-defense',
        {},
        makeFormData({ content: 'hello' })
      );
      expect(result).toEqual({ error: 'signInRequired' });
      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });

    it('should NOT consume rate limit when user is banned', async () => {
      mockIsUserBanned.mockResolvedValue(true);
      const result = await createOpeningPost(
        'en',
        'french-defense',
        {},
        makeFormData({ content: 'hello' })
      );
      expect(result).toEqual({ error: 'banned' });
      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });

    it('should consume rate limit only after all validation passes', async () => {
      await expect(
        createOpeningPost('en', 'french-defense', {}, makeFormData({ content: 'Valid content' }))
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);
    });

    it('should return rateLimited when rate limit is exceeded after validation', async () => {
      mockCheckRateLimit.mockResolvedValue({ error: 'rateLimited' });

      const result = await createOpeningPost(
        'en',
        'french-defense',
        {},
        makeFormData({ content: 'Valid content' })
      );
      expect(result).toEqual({ error: 'rateLimited' });
      expect(mockInsertValues).not.toHaveBeenCalled();
    });
  });

  describe('rating-only validation order', () => {
    it('should consume rate limit when only preferenceRating is provided', async () => {
      await expect(
        createOpeningPost('en', 'french-defense', {}, makeFormData({ preferenceRating: '3' }))
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);
    });

    it('should consume rate limit when only proficiencyRating is provided', async () => {
      await expect(
        createOpeningPost('en', 'french-defense', {}, makeFormData({ proficiencyRating: '4' }))
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);
    });
  });

  describe('activity logging', () => {
    it('should log create_post activity event on success', async () => {
      await expect(
        createOpeningPost('en', 'french-defense', {}, makeFormData({ content: 'My post' }))
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(logActivityEvent).toHaveBeenCalledWith({
        userId: testUserId,
        action: 'create_post',
        targetType: 'topic_post',
        targetId: generatedPostId,
        metadata: { topicType: 'opening', topicKey: 'french-defense' },
      });
    });

    it('should not log activity event when validation fails', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await createOpeningPost('en', 'french-defense', {}, makeFormData({ content: 'hello' }));
      expect(logActivityEvent).not.toHaveBeenCalled();
    });
  });
});
