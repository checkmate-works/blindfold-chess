import { describe, expect, it, vi } from 'vitest';

import { toggleLikeBase } from '@/app/[locale]/(public)/topics/_actions/toggleLike';

import { toggleLike } from './toggleLike';

vi.mock('@/app/[locale]/(public)/topics/_actions/toggleLike', () => ({
  toggleLikeBase: vi.fn().mockResolvedValue({ liked: true, likeCount: 1 }),
}));

describe('toggleLike (square wrapper)', () => {
  it('should delegate to toggleLikeBase with square parameters', async () => {
    await toggleLike('post-id', 'en', 'e4');

    expect(toggleLikeBase).toHaveBeenCalledWith({
      postId: 'post-id',
      locale: 'en',
      topicIdentifier: 'e4',
      topicType: 'square',
      urlSegment: 'squares',
      validateTopic: expect.any(Function),
    });
  });
});
