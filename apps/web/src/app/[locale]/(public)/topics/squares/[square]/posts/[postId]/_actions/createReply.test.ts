import { describe, expect, it, vi } from 'vitest';

import { createReplyBase } from '@/app/[locale]/(public)/topics/_actions/createReply';

import { createReply } from './createReply';

vi.mock('@/app/[locale]/(public)/topics/_actions/createReply', () => ({
  createReplyBase: vi.fn().mockResolvedValue({}),
}));

describe('createReply (square wrapper)', () => {
  it('should delegate to createReplyBase with square parameters', async () => {
    const formData = new FormData();
    formData.set('content', 'hello');

    await createReply('en', 'e4', 'post-id', {}, formData);

    expect(createReplyBase).toHaveBeenCalledWith({
      locale: 'en',
      topicIdentifier: 'e4',
      postId: 'post-id',
      topicType: 'square',
      topicKey: 'e4',
      urlSegment: 'squares',
      validateTopic: expect.any(Function),
      formData,
    });
  });
});
