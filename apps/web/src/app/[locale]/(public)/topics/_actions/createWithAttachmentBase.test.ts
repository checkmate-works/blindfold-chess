import { describe, expect, it, vi } from 'vitest';

import { createPostWithAttachmentBase } from './createPostWithAttachmentBase';
import { createReplyWithAttachmentBase } from './createReplyWithAttachmentBase';

const mockResolvePgnAttachment = vi.fn();
const mockCreatePostBase = vi.fn();
const mockCreateReplyBase = vi.fn();

vi.mock('@/lib/topic-posts/attachment-steps', () => ({
  resolvePgnAttachment: (...args: unknown[]) => mockResolvePgnAttachment(...args),
}));

vi.mock('./createPost', () => ({
  createPostBase: (...args: unknown[]) => mockCreatePostBase(...args),
}));

vi.mock('./createReply', () => ({
  createReplyBase: (...args: unknown[]) => mockCreateReplyBase(...args),
}));

function pgError(code: string): Error {
  return Object.assign(new Error(`pg ${code}`), { code });
}

const withAttachment = {
  kind: 'attachment',
  afterInsert: () => async () => {},
};

const postArgs: Parameters<typeof createPostWithAttachmentBase>[0] = {
  locale: 'en',
  topicIdentifier: 'e4',
  topicType: 'square',
  topicKey: 'e4',
  urlSegment: 'squares',
  validateTopic: () => true,
  invalidTopicError: 'invalid',
  rateLimit: { action: 'test', maxAttempts: 1, windowMs: 1000 },
  validateContent: () => ({ content: 'hi' }),
  formData: new FormData(),
};

const replyArgs: Parameters<typeof createReplyWithAttachmentBase>[0] = {
  locale: 'en',
  topicIdentifier: 'e4',
  postId: 'post-1',
  topicType: 'square',
  topicKey: 'e4',
  urlSegment: 'squares',
  validateTopic: () => true,
  formData: new FormData(),
};

describe('createPostWithAttachmentBase — INSERT constraint failures', () => {
  it.each(['23514', '22001'])(
    'maps a %s from the attachment INSERT to the invalid-PGN key',
    async (code) => {
      mockResolvePgnAttachment.mockResolvedValueOnce(withAttachment);
      mockCreatePostBase.mockRejectedValueOnce(pgError(code));

      await expect(createPostWithAttachmentBase(postArgs)).resolves.toEqual({
        error: 'attachment.error.invalidPgn',
      });
    }
  );

  it('rethrows anything else — including the redirect that ends a successful post', async () => {
    mockResolvePgnAttachment.mockResolvedValueOnce(withAttachment);
    mockCreatePostBase.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));

    await expect(createPostWithAttachmentBase(postArgs)).rejects.toThrow('NEXT_REDIRECT');
  });

  it('does not blame the PGN for a constraint failure on a post with no attachment', async () => {
    mockResolvePgnAttachment.mockResolvedValueOnce({ kind: 'none' });
    mockCreatePostBase.mockRejectedValueOnce(pgError('23514'));

    await expect(createPostWithAttachmentBase(postArgs)).rejects.toThrow('pg 23514');
  });
});

describe('createReplyWithAttachmentBase — INSERT constraint failures', () => {
  it('maps a 22001 from the attachment INSERT to the invalid-PGN key', async () => {
    mockResolvePgnAttachment.mockResolvedValueOnce(withAttachment);
    mockCreateReplyBase.mockRejectedValueOnce(pgError('22001'));

    await expect(createReplyWithAttachmentBase(replyArgs)).resolves.toEqual({
      error: 'attachment.error.invalidPgn',
    });
  });

  it('does not blame the PGN for a constraint failure on a reply with no attachment', async () => {
    mockResolvePgnAttachment.mockResolvedValueOnce({ kind: 'none' });
    mockCreateReplyBase.mockRejectedValueOnce(pgError('23514'));

    await expect(createReplyWithAttachmentBase(replyArgs)).rejects.toThrow('pg 23514');
  });
});
