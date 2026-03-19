import { describe, expect, it, vi } from 'vitest';

import { createReplyBase } from '@/app/[locale]/(public)/topics/_actions/createReply';

import { createReply } from './createReply';

vi.mock('@/app/[locale]/(public)/topics/_actions/createReply', () => ({
  createReplyBase: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../../_lib/queries', () => ({
  isValidOpening: vi.fn(),
}));

describe('createReply (opening wrapper)', () => {
  it('should delegate to createReplyBase with opening parameters', async () => {
    const formData = new FormData();
    formData.set('content', 'hello');

    await createReply('en', 'sicilian-defense', 'post-id', {}, formData);

    expect(createReplyBase).toHaveBeenCalledWith({
      locale: 'en',
      topicIdentifier: 'sicilian-defense',
      postId: 'post-id',
      topicType: 'opening',
      topicKey: 'sicilian-defense',
      urlSegment: 'openings',
      validateTopic: expect.any(Function),
      formData,
    });
  });
});
