import { describe, expect, it, vi } from 'vitest';

import { toggleLikeBase } from '@/app/[locale]/(public)/topics/_actions/toggleLike';

import { toggleLike } from './toggleLike';

vi.mock('@/app/[locale]/(public)/topics/_actions/toggleLike', () => ({
  toggleLikeBase: vi.fn().mockResolvedValue({ liked: true, likeCount: 1 }),
}));

vi.mock('../../../../_lib/queries', () => ({
  isValidOpening: vi.fn(),
}));

describe('toggleLike (opening wrapper)', () => {
  it('should delegate to toggleLikeBase with opening parameters', async () => {
    await toggleLike('post-id', 'en', 'sicilian-defense');

    expect(toggleLikeBase).toHaveBeenCalledWith({
      postId: 'post-id',
      locale: 'en',
      topicIdentifier: 'sicilian-defense',
      topicType: 'opening',
      urlSegment: 'openings',
      validateTopic: expect.any(Function),
    });
  });
});
