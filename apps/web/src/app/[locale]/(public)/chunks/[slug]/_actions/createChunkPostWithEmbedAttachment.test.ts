import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createChunkPostWithEmbedAttachment } from './createChunkPostWithEmbedAttachment';

/**
 * Server-side validation pins for the chess.com embed action.
 *
 * Mocks mirror the createChunkPostWithAttachment.test.ts pattern. We
 * mock the data / auth boundary and the rate-limit so we can drive the
 * action with controlled FormData and observe (a) which embed row is
 * persisted, (b) what canonical source_url is reconstructed, and
 * (c) that the per-attachment rate-limit is consumed.
 *
 * `post_game_embed_attachments.embed_provider` is narrowed to
 * `'chesscom'` only (#83). The Lichess-specific test cases in this file
 * were removed; Lichess /embed/{id} URLs are now exercised by
 * createChunkPostWithAttachment.test.ts (PGN auto-fetch path).
 */

const mockGetUser = vi.fn();
const mockIsUserBanned = vi.fn();
const mockGetChunkBySlug = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockInsertValues = vi.fn();
const mockInsertReturning = vi.fn();
const mockEmbedInsertValues = vi.fn();
const mockPgnSelectWhereLimit = vi.fn();
const mockSelectProfile = vi.fn();

vi.mock('@/lib/moderation/block', () => ({
  isBlockedBetween: () => Promise.resolve(false),
  hasBlocked: () => Promise.resolve(false),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('@/lib/users/activity-log');

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

// Embed Server Action runs:
//   1. tx.insert(topicPosts).values(...).returning(...)              ← createPostBase
//   2. tx.select(...).from(postGamePgnAttachments).where(...).limit() ← afterInsert defensive PGN check
//   3. tx.insert(postGameEmbedAttachments).values(...)                ← afterInsert
//
// We branch on the table identity passed to insert(...) / from(...) to
// spy on each interaction.
const mockTx = {
  insert: (table: { __name?: string }) => {
    if (table.__name === 'post_game_embed_attachments') {
      return {
        values: (...args: unknown[]) => {
          mockEmbedInsertValues(...args);
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
  select: () => ({
    from: () => ({
      where: () => ({
        limit: () => mockPgnSelectWhereLimit(),
      }),
    }),
  }),
};

vi.mock('@/lib/db', () => ({
  db: {
    transaction: (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mockSelectProfile(),
        }),
      }),
    }),
  },
  topicPosts: { id: 'id', __name: 'topic_posts' },
  postGamePgnAttachments: { id: 'id', postId: 'post_id', __name: 'post_game_pgn_attachments' },
  postGameEmbedAttachments: { __name: 'post_game_embed_attachments' },
  profiles: { id: 'id', __name: 'profiles' },
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

vi.mock('@/lib/points', () => ({
  grantPointsForPost: vi.fn().mockResolvedValue({ pointEventId: 'pe-1', amount: 3 }),
  clawbackPointsForPost: vi.fn().mockResolvedValue(undefined),
  isPointEligibleTopicType: (v: string) => v === 'square' || v === 'opening',
  POST_CREATION_POINTS: 3,
}));

vi.mock('@/lib/chunks/queries', () => ({
  getChunkBySlug: (slug: string) => mockGetChunkBySlug(slug),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const testSlug = 'rook-battery';

function makeFormData(opts: {
  content?: string;
  replyPermission?: string;
  embedProvider?: string | null;
  embedSourceUrl?: string | null;
  embedId?: string | null;
}): FormData {
  const fd = new FormData();
  fd.set('content', opts.content ?? 'a chunk comment with embed');
  fd.set('replyPermission', opts.replyPermission ?? 'everyone');
  if (opts.embedProvider !== undefined && opts.embedProvider !== null) {
    fd.set('embedProvider', opts.embedProvider);
  }
  if (opts.embedSourceUrl !== undefined && opts.embedSourceUrl !== null) {
    fd.set('embedSourceUrl', opts.embedSourceUrl);
  }
  if (opts.embedId !== undefined && opts.embedId !== null) {
    fd.set('embedId', opts.embedId);
  }
  return fd;
}

describe('createChunkPostWithEmbedAttachment', () => {
  beforeEach(() => {
    mockGetChunkBySlug.mockResolvedValue({ id: 'chunk-1', slug: testSlug });
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockInsertReturning.mockResolvedValue([{ id: generatedPostId }]);
    mockCheckRateLimit.mockResolvedValue({ success: true });
    mockPgnSelectWhereLimit.mockResolvedValue([]); // no pre-existing PGN
    mockSelectProfile.mockResolvedValue([{ id: testUserId }]);
  });

  describe('profile requirement', () => {
    it('returns the profileRequired error and never inserts when the user has no profile', async () => {
      mockSelectProfile.mockResolvedValue([]);

      const result = await createChunkPostWithEmbedAttachment(
        'en',
        testSlug,
        {},
        makeFormData({
          embedProvider: 'chesscom',
          embedSourceUrl: 'https://www.chess.com/emboard?id=98765',
        })
      );

      expect(result).toEqual({ error: 'profileRequired' });
      expect(mockInsertValues).not.toHaveBeenCalled();
      expect(mockEmbedInsertValues).not.toHaveBeenCalled();
    });
  });

  // DB CHECK passes but per-provider regex fails
  describe('per-provider regex stricter than DB CHECK', () => {
    it('rejects a chess.com embedSourceUrl whose id is alphabetic (DB CHECK allows letters, per-provider regex does not)', async () => {
      // chess.com per-provider regex is `^[0-9]{1,15}$` — letters are
      // forbidden. The DB CHECK `^[A-Za-z0-9_-]{1,64}$` allows them.
      const result = await createChunkPostWithEmbedAttachment(
        'en',
        testSlug,
        {},
        makeFormData({
          embedProvider: 'chesscom',
          embedSourceUrl: 'https://www.chess.com/emboard?id=abc',
        })
      );

      expect(result).toEqual({ error: 'attachment.embed.invalidUrl' });
      expect(mockEmbedInsertValues).not.toHaveBeenCalled();
      expect(mockInsertValues).not.toHaveBeenCalled();
    });
  });

  // The canonical source_url is reconstructed server-side: a
  // client-passed embedId is ignored and the raw user input discarded.
  describe('canonical source_url reconstruction', () => {
    it('persists a chess.com embed with NULL attribution columns and the canonical source_url', async () => {
      const userInput = 'https://www.chess.com/emboard?id=98765&irrelevant=track';
      await expect(
        createChunkPostWithEmbedAttachment(
          'en',
          testSlug,
          {},
          makeFormData({
            embedProvider: 'chesscom',
            embedSourceUrl: userInput,
          })
        )
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockEmbedInsertValues).toHaveBeenCalledTimes(1);
      const inserted = mockEmbedInsertValues.mock.calls[0][0];

      // Canonical source_url, NOT the user input.
      expect(inserted.sourceUrl).toBe('https://www.chess.com/emboard?id=98765');
      expect(inserted.sourceUrl).not.toContain('irrelevant');

      expect(inserted.embedProvider).toBe('chesscom');
      expect(inserted.embedId).toBe('98765');

      // chess.com embeds carry no attribution: the emboard URL is the
      // only input, and there is no separate attribution field.
      expect(inserted.attributionPlatform).toBeNull();
      expect(inserted.attributionPath).toBeNull();
    });

    it('IGNORES a client-supplied embedId field — the id is taken from the re-parsed embedSourceUrl', async () => {
      // The form pumps a hostile `embedId='hostileX'` field alongside
      // a legitimate chess.com embedSourceUrl. The Server Action MUST
      // re-parse the URL and discard the hostile id — we never trust
      // a client-passed id.
      const userInput = 'https://www.chess.com/emboard?id=98765';
      await expect(
        createChunkPostWithEmbedAttachment(
          'en',
          testSlug,
          {},
          makeFormData({
            embedProvider: 'chesscom',
            embedSourceUrl: userInput,
            embedId: 'hostileX', // client tries to override
          })
        )
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockEmbedInsertValues).toHaveBeenCalledTimes(1);
      const inserted = mockEmbedInsertValues.mock.calls[0][0];

      // The persisted id is the validated one from the URL — NOT the
      // hostile client-passed value.
      expect(inserted.embedId).toBe('98765');
      expect(inserted.embedId).not.toBe('hostileX');
      // Same for the canonical sourceUrl.
      expect(inserted.sourceUrl).toBe('https://www.chess.com/emboard?id=98765');
      expect(inserted.sourceUrl).not.toContain('hostileX');
    });

    it('rejects a provider/URL mismatch (form says chesscom, URL is Lichess)', async () => {
      // Cross-check: tampered form where the declared provider does
      // not match the URL shape. Fail closed — no insert.
      const result = await createChunkPostWithEmbedAttachment(
        'en',
        testSlug,
        {},
        makeFormData({
          embedProvider: 'chesscom',
          embedSourceUrl: 'https://lichess.org/embed/abcd1234',
        })
      );

      // The chess.com parser will reject the lichess.org host with
      // `wrong_host`, so the user-facing error is the single invalidUrl
      // key. Fail-closed behavior is correct.
      expect(result).toEqual({ error: 'attachment.embed.invalidUrl' });
      expect(mockEmbedInsertValues).not.toHaveBeenCalled();
    });
  });

  // Cross-check: a happy-path chess.com insert succeeds, so the
  // rejection tests above are pinning real validation rather than
  // generic unhappy-path behaviour.
  it('happy path: a valid chess.com embed URL passes both DB-CHECK-shape and per-provider regex', async () => {
    await expect(
      createChunkPostWithEmbedAttachment(
        'en',
        testSlug,
        {},
        makeFormData({
          embedProvider: 'chesscom',
          embedSourceUrl: 'https://www.chess.com/emboard?id=98765',
        })
      )
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockEmbedInsertValues).toHaveBeenCalledTimes(1);
    expect(mockEmbedInsertValues.mock.calls[0][0]).toMatchObject({
      embedProvider: 'chesscom',
      embedId: '98765',
      sourceUrl: 'https://www.chess.com/emboard?id=98765',
      attributionPlatform: null,
      attributionPath: null,
    });
  });
});

/**
 * Regression suite — Lichess provider rejection (#83).
 *
 * The action is now chess.com-only. A form pumping `embedProvider='lichess'`
 * (e.g. a stale page load) must fail closed at the action layer BEFORE
 * any DB insert. This pins the action's narrowed input contract — the
 * underlying DB CHECK (narrowed in the same commit) is the second line
 * of defense.
 */
describe('createChunkPostWithEmbedAttachment — lichess narrowing', () => {
  beforeEach(() => {
    mockGetChunkBySlug.mockResolvedValue({ id: 'chunk-1', slug: testSlug });
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockInsertReturning.mockResolvedValue([{ id: generatedPostId }]);
    mockCheckRateLimit.mockResolvedValue({ success: true });
    mockPgnSelectWhereLimit.mockResolvedValue([]);
    mockSelectProfile.mockResolvedValue([{ id: testUserId }]);
  });

  it('rejects embedProvider="lichess" with the invalidUrl error key', async () => {
    // A form claiming `lichess` is no longer a valid provider here —
    // Lichess /embed/{id} URLs are routed to createChunkPostWithAttachment.
    // The action returns the same generic error key as malformed input.
    const result = await createChunkPostWithEmbedAttachment(
      'en',
      testSlug,
      {},
      makeFormData({
        embedProvider: 'lichess',
        embedSourceUrl: 'https://lichess.org/embed/abcd1234',
      })
    );

    expect(result).toEqual({ error: 'attachment.embed.invalidUrl' });

    // Nothing reached the DB layer.
    expect(mockEmbedInsertValues).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });
});

/**
 * The PGN/embed exclusivity invariant.
 *
 * The PGN/embed exclusivity invariant is enforced by the Server Action's
 * `afterInsert` defensive check, NOT by a DB constraint. This test pumps
 * the mock to simulate a pre-existing PGN attachment row and confirms
 * the action throws (which surfaces to the user as a transaction
 * rollback / error path).
 */
describe('createChunkPostWithEmbedAttachment — application-layer exclusivity', () => {
  beforeEach(() => {
    mockGetChunkBySlug.mockResolvedValue({ id: 'chunk-1', slug: testSlug });
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockInsertReturning.mockResolvedValue([{ id: generatedPostId }]);
    mockCheckRateLimit.mockResolvedValue({ success: true });
    mockSelectProfile.mockResolvedValue([{ id: testUserId }]);
  });

  it('throws when a PGN attachment already exists for the same post (exclusivity invariant)', async () => {
    // Simulate a row already present in post_game_pgn_attachments for
    // the new postId — the defensive check should detect it and throw
    // before the embed row is inserted.
    mockPgnSelectWhereLimit.mockResolvedValue([{ id: 'existing-pgn-row' }]);

    await expect(
      createChunkPostWithEmbedAttachment(
        'en',
        testSlug,
        {},
        makeFormData({
          embedProvider: 'chesscom',
          embedSourceUrl: 'https://www.chess.com/emboard?id=98765',
        })
      )
    ).rejects.toThrow(/PGN\/embed exclusivity/);

    // No embed row was persisted (the throw happened before the insert).
    expect(mockEmbedInsertValues).not.toHaveBeenCalled();
  });
});
