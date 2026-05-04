import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createChunkPostWithVideoAttachment } from './createChunkPostWithVideoAttachment';

const mockGetUser = vi.fn();
const mockIsUserBanned = vi.fn();
const mockGetChunkBySlug = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockInsertValues = vi.fn();
const mockInsertReturning = vi.fn();
const mockVideoInsertValues = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('@/lib/users/activity-log', () => ({
  logActivityEvent: vi.fn(),
}));

vi.mock('@/lib/notifications/notification', () => ({
  notifyFollowersOfNewPost: vi.fn(),
  createNotification: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { getUser: mockGetUser } }),
}));

const generatedPostId = 'post-00000000-0000-0000-0000-0000000000aa';

const mockTx = {
  insert: (table: { __name?: string }) => {
    if (table.__name === 'post_video_attachments') {
      return {
        values: (...args: unknown[]) => {
          mockVideoInsertValues(...args);
          return Promise.resolve();
        },
      };
    }
    return {
      values: (...args: unknown[]) => {
        mockInsertValues(...args);
        return { returning: () => mockInsertReturning() };
      },
    };
  },
};

vi.mock('@/lib/db', () => ({
  db: {
    transaction: (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
  },
  topicPosts: { id: 'id', __name: 'topic_posts' },
  postVideoAttachments: { __name: 'post_video_attachments' },
  feedItems: { __name: 'feed_items' },
}));

vi.mock('@/lib/moderation/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  RATE_LIMITS: {
    createPost: { action: 'create_post', maxAttempts: 10, windowMs: 3_600_000 },
  },
}));

const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error('NEXT_REDIRECT');
  },
}));

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

vi.mock('@/lib/users/user-grants', () => ({
  applyAutomatedGrant: vi.fn().mockResolvedValue({ grantId: 'g1', expiresAt: new Date() }),
}));

vi.mock('@/lib/chunks/queries', () => ({
  getChunkBySlug: (slug: string) => mockGetChunkBySlug(slug),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const testSlug = 'rook-battery';

const VALID_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const VALID_VIDEO_ID = 'dQw4w9WgXcQ';

function makeFormData(opts: {
  content?: string;
  replyPermission?: string;
  url?: string | null;
}): FormData {
  const fd = new FormData();
  fd.set('content', opts.content ?? 'a chunk comment with video');
  fd.set('replyPermission', opts.replyPermission ?? 'everyone');
  if (opts.url !== undefined && opts.url !== null) fd.set('attachmentVideoUrl', opts.url);
  return fd;
}

describe('createChunkPostWithVideoAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetChunkBySlug.mockResolvedValue({ id: 'chunk-1', slug: testSlug });
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockInsertReturning.mockResolvedValue([{ id: generatedPostId }]);
    mockCheckRateLimit.mockResolvedValue({ success: true });
  });

  it('happy path inserts a video row alongside the post and redirects', async () => {
    await expect(
      createChunkPostWithVideoAttachment('en', testSlug, {}, makeFormData({ url: VALID_URL }))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockVideoInsertValues).toHaveBeenCalledTimes(1);
    const inserted = mockVideoInsertValues.mock.calls[0][0];
    expect(inserted.postId).toBe(generatedPostId);
    expect(inserted.provider).toBe('youtube');
    expect(inserted.providerVideoId).toBe(VALID_VIDEO_ID);
    // Persisted source_url is the parser's canonical, which for YouTube
    // watch is the input host stripped to the canonical form. We accept
    // anything the parser returns as long as it is not blank.
    expect(typeof inserted.sourceUrl).toBe('string');
    expect((inserted.sourceUrl as string).length).toBeGreaterThan(0);
  });

  it('trims URL whitespace at action entry (Lessons §10)', async () => {
    const padded = `\n  ${VALID_URL}  \t`;
    await expect(
      createChunkPostWithVideoAttachment('en', testSlug, {}, makeFormData({ url: padded }))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockVideoInsertValues).toHaveBeenCalledTimes(1);
    expect(mockVideoInsertValues.mock.calls[0][0].providerVideoId).toBe(VALID_VIDEO_ID);
  });

  it('rejects empty URL with urlRequired', async () => {
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: '   ' })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.urlRequired' });
  });

  it('rejects over-long input pre-parse with inputTooLong', async () => {
    const longUrl = `https://www.youtube.com/watch?v=${'x'.repeat(600)}`;
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: longUrl })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.inputTooLong' });
  });

  it('rejects a non-YouTube host with hostNotAllowed', async () => {
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: 'https://vimeo.com/12345' })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.hostNotAllowed' });
  });

  it('maps PG 23505 to alreadyAttached', async () => {
    const err = Object.assign(new Error('duplicate'), { code: '23505' });
    mockInsertReturning.mockImplementationOnce(() => {
      throw err;
    });
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: VALID_URL })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.alreadyAttached' });
  });

  it('walks err.cause for PG 23505 (canonical extractPgErrorCode, Lessons §16)', async () => {
    const inner = Object.assign(new Error('duplicate'), { code: '23505' });
    const wrapped = new Error('Drizzle wrapper');
    (wrapped as Error & { cause?: unknown }).cause = inner;
    mockInsertReturning.mockImplementationOnce(() => {
      throw wrapped;
    });
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: VALID_URL })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.alreadyAttached' });
  });

  it('maps PG 23514 to invalidVideoStructure (defense-in-depth)', async () => {
    const err = Object.assign(new Error('check'), { code: '23514' });
    mockInsertReturning.mockImplementationOnce(() => {
      throw err;
    });
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: VALID_URL })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.invalidVideoStructure' });
  });

  it('maps PG 22001 to tooLong (defense-in-depth)', async () => {
    const err = Object.assign(new Error('truncation'), { code: '22001' });
    mockInsertReturning.mockImplementationOnce(() => {
      throw err;
    });
    const result = await createChunkPostWithVideoAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ url: VALID_URL })
    );
    expect(result).toEqual({ error: 'postVideoAttachment.error.tooLong' });
  });

  it('re-throws unmapped errors', async () => {
    mockInsertReturning.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(
      createChunkPostWithVideoAttachment('en', testSlug, {}, makeFormData({ url: VALID_URL }))
    ).rejects.toThrow('boom');
  });
});
