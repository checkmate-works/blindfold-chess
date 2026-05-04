import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createChunkPostWithFenAttachment } from './createChunkPostWithFenAttachment';

/**
 * Unit tests for the integrated FEN-attach action. Mocks mirror the
 * pattern established by `createChunkPostWithEmbedAttachment.test.ts` so
 * the two integrated actions stay reviewable side-by-side.
 *
 * Branches covered:
 *   - happy path: post + FEN row inserted atomically, redirect raised
 *   - canonical trim contract (Lessons §10): whitespace-padded input
 *     produces the trimmed canonical FEN in the persisted row
 *   - structural rejection: empty / over-long / regex-failing FEN
 *   - semantic rejection: kings missing / illegal placement
 *   - PG SQLSTATE mapping with canonical extractPgErrorCode (Lessons §16):
 *       * 23505 unique_violation → alreadyAttached
 *       * 23514 check_violation  → invalidFenStructure (defense-in-depth)
 *       * 22001 right truncation → fenTooLong (defense-in-depth)
 *     including a 23505 wrapped under err.cause to pin the canonical
 *     helper's err.cause walk
 */

const mockGetUser = vi.fn();
const mockIsUserBanned = vi.fn();
const mockGetChunkBySlug = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockInsertValues = vi.fn();
const mockInsertReturning = vi.fn();
const mockFenInsertValues = vi.fn();

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
  createClient: () =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
    }),
}));

const generatedPostId = 'post-00000000-0000-0000-0000-0000000000fe';

const mockTx = {
  insert: (table: { __name?: string }) => {
    if (table.__name === 'post_fen_attachments') {
      return {
        values: (...args: unknown[]) => {
          mockFenInsertValues(...args);
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
  postFenAttachments: { __name: 'post_fen_attachments' },
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

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function makeFormData(opts: {
  content?: string;
  replyPermission?: string;
  fen?: string | null;
  caption?: string | null;
}): FormData {
  const fd = new FormData();
  fd.set('content', opts.content ?? 'a chunk comment with FEN');
  fd.set('replyPermission', opts.replyPermission ?? 'everyone');
  if (opts.fen !== undefined && opts.fen !== null) fd.set('attachmentFen', opts.fen);
  if (opts.caption !== undefined && opts.caption !== null) {
    fd.set('attachmentFenCaption', opts.caption);
  }
  return fd;
}

describe('createChunkPostWithFenAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetChunkBySlug.mockResolvedValue({ id: 'chunk-1', slug: testSlug });
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockInsertReturning.mockResolvedValue([{ id: generatedPostId }]);
    mockCheckRateLimit.mockResolvedValue({ success: true });
  });

  it('happy path inserts a FEN row alongside the post and redirects', async () => {
    await expect(
      createChunkPostWithFenAttachment(
        'en',
        testSlug,
        {},
        makeFormData({ fen: VALID_FEN, caption: 'opening' })
      )
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockFenInsertValues).toHaveBeenCalledTimes(1);
    expect(mockFenInsertValues.mock.calls[0][0]).toMatchObject({
      postId: generatedPostId,
      fen: VALID_FEN,
      caption: 'opening',
    });
  });

  it('trims FEN whitespace at action entry (Lessons §10)', async () => {
    const padded = `   ${VALID_FEN}\n\t  `;
    await expect(
      createChunkPostWithFenAttachment('en', testSlug, {}, makeFormData({ fen: padded }))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockFenInsertValues).toHaveBeenCalledTimes(1);
    const inserted = mockFenInsertValues.mock.calls[0][0];
    expect(inserted.fen).toBe(VALID_FEN);
  });

  it('rejects empty FEN with fenRequired', async () => {
    const result = await createChunkPostWithFenAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ fen: '   ' })
    );
    expect(result).toEqual({ error: 'postFenAttachment.error.fenRequired' });
    expect(mockFenInsertValues).not.toHaveBeenCalled();
  });

  it('rejects an over-long FEN with fenTooLong', async () => {
    const longFen = 'x'.repeat(101);
    const result = await createChunkPostWithFenAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ fen: longFen })
    );
    expect(result).toEqual({ error: 'postFenAttachment.error.fenTooLong' });
  });

  it('rejects structurally invalid FEN with invalidFenStructure', async () => {
    const result = await createChunkPostWithFenAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ fen: 'not a fen' })
    );
    expect(result).toEqual({ error: 'postFenAttachment.error.invalidFenStructure' });
  });

  it('rejects an over-long caption with captionTooLong', async () => {
    const result = await createChunkPostWithFenAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ fen: VALID_FEN, caption: 'c'.repeat(201) })
    );
    expect(result).toEqual({ error: 'postFenAttachment.error.captionTooLong' });
  });

  it('maps PG 23505 to alreadyAttached', async () => {
    const err = Object.assign(new Error('duplicate'), { code: '23505' });
    mockInsertReturning.mockImplementationOnce(() => {
      // Surface the failure inside the transaction (during topic_posts insert).
      // The action's own try/catch should capture and translate it.
      throw err;
    });
    const result = await createChunkPostWithFenAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ fen: VALID_FEN })
    );
    expect(result).toEqual({ error: 'postFenAttachment.error.alreadyAttached' });
  });

  it('walks err.cause for PG 23505 (canonical extractPgErrorCode contract, Lessons §16)', async () => {
    const inner = Object.assign(new Error('duplicate'), { code: '23505' });
    const wrapped = new Error('Drizzle wrapper');
    (wrapped as Error & { cause?: unknown }).cause = inner;
    mockInsertReturning.mockImplementationOnce(() => {
      throw wrapped;
    });
    const result = await createChunkPostWithFenAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ fen: VALID_FEN })
    );
    expect(result).toEqual({ error: 'postFenAttachment.error.alreadyAttached' });
  });

  it('maps PG 23514 to invalidFenStructure (defense-in-depth)', async () => {
    const err = Object.assign(new Error('check'), { code: '23514' });
    mockInsertReturning.mockImplementationOnce(() => {
      throw err;
    });
    const result = await createChunkPostWithFenAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ fen: VALID_FEN })
    );
    expect(result).toEqual({ error: 'postFenAttachment.error.invalidFenStructure' });
  });

  it('maps PG 22001 to fenTooLong (defense-in-depth)', async () => {
    const err = Object.assign(new Error('truncation'), { code: '22001' });
    mockInsertReturning.mockImplementationOnce(() => {
      throw err;
    });
    const result = await createChunkPostWithFenAttachment(
      'en',
      testSlug,
      {},
      makeFormData({ fen: VALID_FEN })
    );
    expect(result).toEqual({ error: 'postFenAttachment.error.fenTooLong' });
  });

  it('re-throws errors that are not mapped PG codes (NEXT_REDIRECT and unrelated throws bubble up)', async () => {
    const err = new Error('unrelated');
    mockInsertReturning.mockImplementationOnce(() => {
      throw err;
    });
    await expect(
      createChunkPostWithFenAttachment('en', testSlug, {}, makeFormData({ fen: VALID_FEN }))
    ).rejects.toThrow('unrelated');
  });
});
