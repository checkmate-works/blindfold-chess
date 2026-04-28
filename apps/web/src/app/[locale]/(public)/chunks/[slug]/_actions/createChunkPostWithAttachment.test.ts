import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createChunkPostWithAttachment } from './createChunkPostWithAttachment';

// ─── Module mocks ───
//
// These mirror the createChunkPost.test.ts pattern. We mock the data /
// auth boundary so we can drive the action with controlled inputs and
// observe (a) which DB rows are written and (b) which rate-limit slots
// are consumed.

const mockGetUser = vi.fn();
const mockIsUserBanned = vi.fn();
const mockGetChunkBySlug = vi.fn();
const mockResolveLichessAttachmentPgn = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockInsertValues = vi.fn();
const mockInsertReturning = vi.fn();
const mockAttachmentInsertValues = vi.fn();

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
      auth: {
        getUser: mockGetUser,
      },
    }),
}));

const generatedPostId = 'post-00000000-0000-0000-0000-000000000001';

// `tx.insert(...)` is called twice per attachment-bearing path:
//   1. tx.insert(topicPosts).values(...).returning(...)
//   2. tx.insert(postGameAttachments).values(...)        ← afterInsert hook
//
// We branch on the table identity passed to insert(...) to spy on each.
const mockTx = {
  insert: (table: { __name?: string }) => {
    if (table.__name === 'post_game_attachments') {
      return {
        values: (...args: unknown[]) => {
          mockAttachmentInsertValues(...args);
          return Promise.resolve();
        },
      };
    }
    return {
      values: (...args: unknown[]) => {
        mockInsertValues(...args);
        return {
          returning: () => mockInsertReturning(),
        };
      },
    };
  },
};

vi.mock('@/lib/db', () => ({
  db: {
    transaction: (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
  },
  topicPosts: { id: 'id', __name: 'topic_posts' },
  postGameAttachments: { __name: 'post_game_attachments' },
  feedItems: { __name: 'feed_items' },
}));

vi.mock('@/lib/moderation/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  RATE_LIMITS: {
    createPost: { action: 'create_post', maxAttempts: 10, windowMs: 3_600_000 },
    createPostWithAttachment: {
      action: 'create_post_with_attachment',
      maxAttempts: 5,
      windowMs: 3_600_000,
    },
  },
}));

const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error('NEXT_REDIRECT');
  },
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/users/user-grants', () => ({
  applyAutomatedGrant: vi.fn().mockResolvedValue({ grantId: 'g1', expiresAt: new Date() }),
}));

vi.mock('@/lib/chunks/queries', () => ({
  getChunkBySlug: (slug: string) => mockGetChunkBySlug(slug),
}));

vi.mock('@/lib/games/resolve-lichess-attachment', () => ({
  resolveLichessAttachmentPgn: (...args: unknown[]) => mockResolveLichessAttachmentPgn(...args),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const testSlug = 'rook-battery';

function makeFormData(opts: {
  content?: string;
  replyPermission?: string;
  attachment?: string | null;
  anonymize?: boolean;
}): FormData {
  const fd = new FormData();
  fd.set('content', opts.content ?? 'a chunk comment');
  fd.set('replyPermission', opts.replyPermission ?? 'everyone');
  if (opts.attachment !== undefined && opts.attachment !== null) {
    fd.set('attachment', opts.attachment);
  }
  if (opts.anonymize) {
    fd.set('attachmentAnonymize', 'on');
  }
  return fd;
}

const SIMPLE_PGN = '1. e4 e5 2. Nf3 Nc6';

describe('createChunkPostWithAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetChunkBySlug.mockResolvedValue({ id: 'chunk-1', slug: testSlug });
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockInsertReturning.mockResolvedValue([{ id: generatedPostId }]);
    mockCheckRateLimit.mockResolvedValue({ success: true });
  });

  describe('no-attachment fast path', () => {
    it('does NOT consume the createPostWithAttachment rate limit when attachment is absent', async () => {
      await expect(
        createChunkPostWithAttachment('en', testSlug, {}, makeFormData({ content: 'no game here' }))
      ).rejects.toThrow('NEXT_REDIRECT');

      // Only the base createPost limit should have been touched, NOT
      // the per-attachment one.
      const actions = mockCheckRateLimit.mock.calls.map((c) => (c[1] as { action: string }).action);
      expect(actions).not.toContain('create_post_with_attachment');
      expect(actions).toContain('create_post');
    });

    it('does NOT insert an attachment row when attachment is absent', async () => {
      await expect(
        createChunkPostWithAttachment('en', testSlug, {}, makeFormData({}))
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockAttachmentInsertValues).not.toHaveBeenCalled();
    });

    it('treats whitespace-only attachment as empty (no rate-limit consumption)', async () => {
      await expect(
        createChunkPostWithAttachment('en', testSlug, {}, makeFormData({ attachment: '   \n\t  ' }))
      ).rejects.toThrow('NEXT_REDIRECT');

      const actions = mockCheckRateLimit.mock.calls.map((c) => (c[1] as { action: string }).action);
      expect(actions).not.toContain('create_post_with_attachment');
    });
  });

  describe('successful PGN attachment', () => {
    it('inserts the attachment row with normalized PGN and consumes BOTH rate limit slots (1 each)', async () => {
      await expect(
        createChunkPostWithAttachment('en', testSlug, {}, makeFormData({ attachment: SIMPLE_PGN }))
      ).rejects.toThrow('NEXT_REDIRECT');

      // Both slots were consumed exactly once each — the attachment slot
      // FIRST (before createPostBase even runs), the base createPost slot
      // second (inside createPostBase).
      const actions = mockCheckRateLimit.mock.calls.map((c) => (c[1] as { action: string }).action);
      expect(actions.filter((a) => a === 'create_post_with_attachment').length).toBe(1);
      expect(actions.filter((a) => a === 'create_post').length).toBe(1);

      // attachment row was written
      expect(mockAttachmentInsertValues).toHaveBeenCalledTimes(1);
      const insertedRow = mockAttachmentInsertValues.mock.calls[0][0];
      expect(insertedRow).toMatchObject({
        postId: generatedPostId,
        source: 'pgn',
        sourceUrl: null,
        sourceGameId: null,
        anonymized: false,
      });
      expect(typeof insertedRow.pgn).toBe('string');
      expect(insertedRow.pgn.length).toBeGreaterThan(0);
      expect(insertedRow.moveCount).toBe(4);
    });
  });

  describe('failed validation (invalid PGN)', () => {
    it('CONSUMES the createPostWithAttachment slot even when PGN validation fails (M4 finding)', async () => {
      // The attachment looks like PGN (has a leading [Event] header) so
      // detectAttachmentInput classifies it as 'pgn', then validateAttachedPgn
      // rejects it as invalid_pgn.
      const garbage = '[Event "x"]\n\n1. e9 z9 2. !!! garbage';

      const result = await createChunkPostWithAttachment(
        'en',
        testSlug,
        {},
        makeFormData({ attachment: garbage })
      );

      expect(result).toEqual({ error: 'attachment.error.invalidPgn' });

      // The slot was consumed (this documents the M4 issue).
      const actions = mockCheckRateLimit.mock.calls.map((c) => (c[1] as { action: string }).action);
      expect(actions).toContain('create_post_with_attachment');

      // No post was created.
      expect(mockInsertValues).not.toHaveBeenCalled();
      expect(mockAttachmentInsertValues).not.toHaveBeenCalled();
    });
  });

  describe('Lichess fetch failure (mocked 429)', () => {
    it('CONSUMES the createPostWithAttachment slot when Lichess returns rate_limited (M4 finding)', async () => {
      mockResolveLichessAttachmentPgn.mockResolvedValue({
        ok: false,
        error: 'rate_limited',
      });

      const result = await createChunkPostWithAttachment(
        'en',
        testSlug,
        {},
        makeFormData({ attachment: 'https://lichess.org/abcd1234' })
      );

      expect(result).toEqual({ error: 'attachment.error.lichessRateLimited' });

      const actions = mockCheckRateLimit.mock.calls.map((c) => (c[1] as { action: string }).action);
      expect(actions).toContain('create_post_with_attachment');

      expect(mockResolveLichessAttachmentPgn).toHaveBeenCalledWith('abcd1234');
      expect(mockInsertValues).not.toHaveBeenCalled();
      expect(mockAttachmentInsertValues).not.toHaveBeenCalled();
    });
  });

  describe('rate limit exceeded (per-attachment)', () => {
    it('returns the rateLimitedPostWithAttachment error and never consults Lichess or chess-core', async () => {
      mockCheckRateLimit.mockResolvedValueOnce({ error: 'rateLimited' });

      const result = await createChunkPostWithAttachment(
        'en',
        testSlug,
        {},
        makeFormData({ attachment: 'https://lichess.org/abcd1234' })
      );

      expect(result).toEqual({
        error: 'attachment.error.rateLimitedPostWithAttachment',
      });
      expect(mockResolveLichessAttachmentPgn).not.toHaveBeenCalled();
      expect(mockInsertValues).not.toHaveBeenCalled();
      expect(mockAttachmentInsertValues).not.toHaveBeenCalled();
    });
  });

  describe('chess.com attribution path', () => {
    it('persists source=pgn + attribution_platform/path when URL is pasted with a PGN body', async () => {
      const input = `https://www.chess.com/game/live/9876
[Event "Live Chess"]
[White "Alice"]
[Black "Bob"]

1. e4 e5 2. Nf3 Nc6`;

      await expect(
        createChunkPostWithAttachment('en', testSlug, {}, makeFormData({ attachment: input }))
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockAttachmentInsertValues).toHaveBeenCalledTimes(1);
      const inserted = mockAttachmentInsertValues.mock.calls[0][0];
      // PGN was the user-pasted body, NOT something we fetched.
      expect(inserted.source).toBe('pgn');
      // The persisted source_url is the original URL (audit only) —
      // the renderer rebuilds the href from the attribution columns.
      expect(inserted.sourceUrl).toBe('https://www.chess.com/game/live/9876');
      expect(inserted.attributionPlatform).toBe('chesscom');
      expect(inserted.attributionPath).toBe('/game/live/9876');
      // Lichess fields are unset for this path.
      expect(inserted.sourceGameId).toBeNull();
    });
  });

  describe('anonymize=true contract', () => {
    it('writes Player 1 / Player 2 headers and a normalized PGN that does not contain the original names', async () => {
      const namedPgn =
        '[Event "Test"]\n[White "AliceTheGreat"]\n[Black "BobTheWise"]\n\n1. e4 e5 2. Nf3 Nc6';

      await expect(
        createChunkPostWithAttachment(
          'en',
          testSlug,
          {},
          makeFormData({ attachment: namedPgn, anonymize: true })
        )
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockAttachmentInsertValues).toHaveBeenCalledTimes(1);
      const inserted = mockAttachmentInsertValues.mock.calls[0][0];

      // Stored header columns should be the anonymous defaults.
      expect(inserted.headerWhite).toBe('Player 1');
      expect(inserted.headerBlack).toBe('Player 2');
      expect(inserted.anonymized).toBe(true);

      // The stored PGN text MUST NOT carry the original names — this is
      // the load-bearing privacy contract for anonymize=true.
      expect(inserted.pgn).not.toContain('AliceTheGreat');
      expect(inserted.pgn).not.toContain('BobTheWise');
      expect(inserted.pgn).toContain('Player 1');
      expect(inserted.pgn).toContain('Player 2');
    });

    it('also anonymizes Lichess-sourced PGN when anonymize=true', async () => {
      const namedPgn = '[White "MagnusC"]\n[Black "HikaruN"]\n\n1. e4 e5';
      mockResolveLichessAttachmentPgn.mockResolvedValue({
        ok: true,
        pgn: namedPgn,
        canonicalUrl: 'https://lichess.org/abcd1234',
      });

      await expect(
        createChunkPostWithAttachment(
          'en',
          testSlug,
          {},
          makeFormData({ attachment: 'https://lichess.org/abcd1234', anonymize: true })
        )
      ).rejects.toThrow('NEXT_REDIRECT');

      const inserted = mockAttachmentInsertValues.mock.calls[0][0];
      expect(inserted.source).toBe('lichess');
      expect(inserted.sourceGameId).toBe('abcd1234');
      expect(inserted.sourceUrl).toBe('https://lichess.org/abcd1234');
      expect(inserted.headerWhite).toBe('Player 1');
      expect(inserted.headerBlack).toBe('Player 2');
      expect(inserted.pgn).not.toContain('MagnusC');
      expect(inserted.pgn).not.toContain('HikaruN');
    });
  });

  describe('detectAttachmentInput error mapping', () => {
    it('returns the chesscomPgnRequired i18n key when chess.com URL is pasted alone', async () => {
      // chess.com URL with no PGN body — the user must paste both.
      const result = await createChunkPostWithAttachment(
        'en',
        testSlug,
        {},
        makeFormData({ attachment: 'https://www.chess.com/game/live/123' })
      );
      expect(result).toEqual({ error: 'attachment.error.chesscomPgnRequired' });
    });

    it('returns the chesscomInvalidUrl i18n key for hostile chess.com-shaped URLs', async () => {
      const result = await createChunkPostWithAttachment(
        'en',
        testSlug,
        {},
        makeFormData({ attachment: 'https://www.chess.com@evil.tld/foo' })
      );
      expect(result).toEqual({ error: 'attachment.error.chesscomInvalidUrl' });
    });

    it('returns the lichessStudyUnsupported i18n key for Lichess study URLs', async () => {
      const result = await createChunkPostWithAttachment(
        'en',
        testSlug,
        {},
        makeFormData({ attachment: 'https://lichess.org/study/AbCdEfGh' })
      );
      expect(result).toEqual({
        error: 'attachment.error.lichessStudyUnsupported',
      });
    });

    it('returns the generic invalidPgn key for unparseable input', async () => {
      const result = await createChunkPostWithAttachment(
        'en',
        testSlug,
        {},
        makeFormData({ attachment: 'just some random text' })
      );
      expect(result).toEqual({ error: 'attachment.error.invalidPgn' });
    });
  });
});
