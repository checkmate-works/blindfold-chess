import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createChunkPostWithEmbedAttachment } from './createChunkPostWithEmbedAttachment';

/**
 * Phase B Tester suite — D8 #45 / #46.
 *
 * Mocks mirror the createChunkPostWithAttachment.test.ts pattern. We
 * mock the data / auth boundary and the rate-limit so we can drive the
 * action with controlled FormData and observe (a) which embed row is
 * persisted, (b) what canonical source_url is reconstructed, and
 * (c) that the per-attachment rate-limit is consumed.
 */

const mockGetUser = vi.fn();
const mockIsUserBanned = vi.fn();
const mockGetChunkBySlug = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockInsertValues = vi.fn();
const mockInsertReturning = vi.fn();
const mockEmbedInsertValues = vi.fn();
const mockPgnSelectWhereLimit = vi.fn();

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
  },
  topicPosts: { id: 'id', __name: 'topic_posts' },
  postGamePgnAttachments: { id: 'id', postId: 'post_id', __name: 'post_game_pgn_attachments' },
  postGameEmbedAttachments: { __name: 'post_game_embed_attachments' },
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

describe('createChunkPostWithEmbedAttachment — Phase B Tester #45 / #46', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetChunkBySlug.mockResolvedValue({ id: 'chunk-1', slug: testSlug });
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockInsertReturning.mockResolvedValue([{ id: generatedPostId }]);
    mockCheckRateLimit.mockResolvedValue({ success: true });
    mockPgnSelectWhereLimit.mockResolvedValue([]); // no pre-existing PGN
  });

  // #45 — DB CHECK passes but per-provider regex fails
  describe('#45 per-provider regex stricter than DB CHECK', () => {
    it('rejects a Lichess embedSourceUrl whose id has an underscore (allowed by DB CHECK, disallowed by per-provider regex)', async () => {
      // The DB CHECK is `^[A-Za-z0-9_-]{1,64}$` — an underscore is
      // permitted there. The Lichess per-provider regex is
      // `^[A-Za-z0-9]{8}$`, which forbids the underscore. The Server
      // Action's parser must use the per-provider regex, NOT the
      // looser DB CHECK, so this URL should never reach the DB.
      //
      // The provider on the form claims `lichess`. The id is exactly
      // 8 chars, all in [A-Za-z0-9_-], so it satisfies the DB CHECK.
      // But the URL parser path regex is `^/embed/([A-Za-z0-9]{8})$`,
      // which excludes `_`, so the parser fails with `invalid_path`
      // (or `invalid_id` — collapsed to a single user-facing key).
      const result = await createChunkPostWithEmbedAttachment(
        'en',
        testSlug,
        {},
        makeFormData({
          embedProvider: 'lichess',
          embedSourceUrl: 'https://lichess.org/embed/abc_1234',
        })
      );

      // Single user-facing error key. The granular reason is logged
      // server-side but not exposed.
      expect(result).toEqual({ error: 'attachment.embed.invalidUrl' });

      // No embed row was persisted, no post was created.
      expect(mockEmbedInsertValues).not.toHaveBeenCalled();
      expect(mockInsertValues).not.toHaveBeenCalled();
    });

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

  // #46 — canonical source_url reconstruction; client-passed embedId is
  //       ignored entirely; raw user input is discarded.
  describe('#46 canonical source_url reconstruction', () => {
    it('persists a Lichess embed with source_url rebuilt from (provider, embedId), discarding tracker query strings', async () => {
      // The user pastes a URL that carries a hostile-looking tracker
      // query string. The parser tolerates trailing query (the embed
      // path itself is exact), but the persisted source_url must be
      // the canonical form built from the validated (provider, embedId).
      const userInput = 'https://lichess.org/embed/abcd1234?utm_source=evil&pwn=1';
      await expect(
        createChunkPostWithEmbedAttachment(
          'en',
          testSlug,
          {},
          makeFormData({
            embedProvider: 'lichess',
            embedSourceUrl: userInput,
          })
        )
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockEmbedInsertValues).toHaveBeenCalledTimes(1);
      const inserted = mockEmbedInsertValues.mock.calls[0][0];

      // Canonical source_url — NOT the user input. The tracker params
      // and any other extra structure of the user input have been
      // stripped; only the validated id survives.
      expect(inserted.sourceUrl).toBe('https://lichess.org/embed/abcd1234');
      expect(inserted.sourceUrl).not.toContain('utm_source');
      expect(inserted.sourceUrl).not.toContain('pwn');

      // Validated discriminator + id pair persisted.
      expect(inserted.embedProvider).toBe('lichess');
      expect(inserted.embedId).toBe('abcd1234');

      // Lichess attribution is auto-derived from the validated id.
      expect(inserted.attributionPlatform).toBe('lichess');
      expect(inserted.attributionPath).toBe('/abcd1234');

      // postId points at the just-created post.
      expect(inserted.postId).toBe(generatedPostId);
    });

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

      // chess.com path: NULL attribution per Q1.
      expect(inserted.attributionPlatform).toBeNull();
      expect(inserted.attributionPath).toBeNull();
    });

    it('IGNORES a client-supplied embedId field — the id is taken from the re-parsed embedSourceUrl', async () => {
      // The form pumps a hostile `embedId='hostileX'` field alongside
      // a legitimate Lichess embedSourceUrl. The Server Action MUST
      // re-parse the URL and discard the hostile id — we never trust
      // a client-passed id (SecurityEngineer baseline D8 #46).
      const userInput = 'https://lichess.org/embed/abcd1234';
      await expect(
        createChunkPostWithEmbedAttachment(
          'en',
          testSlug,
          {},
          makeFormData({
            embedProvider: 'lichess',
            embedSourceUrl: userInput,
            embedId: 'hostileX', // client tries to override
          })
        )
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(mockEmbedInsertValues).toHaveBeenCalledTimes(1);
      const inserted = mockEmbedInsertValues.mock.calls[0][0];

      // The persisted id is the validated one from the URL — NOT the
      // hostile client-passed value.
      expect(inserted.embedId).toBe('abcd1234');
      expect(inserted.embedId).not.toBe('hostileX');
      // Same for the canonical sourceUrl.
      expect(inserted.sourceUrl).toBe('https://lichess.org/embed/abcd1234');
      expect(inserted.sourceUrl).not.toContain('hostileX');
      // Auto-derived attribution path is also from the validated id.
      expect(inserted.attributionPath).toBe('/abcd1234');
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
      // `wrong_host` BEFORE the cross-check runs, so the user-facing
      // error is still the single invalidUrl key. Either path lands
      // on the same error — both are correct fail-closed behavior.
      expect(result).toEqual({ error: 'attachment.embed.invalidUrl' });
      expect(mockEmbedInsertValues).not.toHaveBeenCalled();
    });
  });

  // #45 cross-check: a happy-path Lichess insert succeeds (sanity check
  //                   that the validation tests above are testing real
  //                   rejection, not generic unhappy-path behavior).
  it('happy path: a valid Lichess embed URL passes both DB-CHECK-shape and per-provider regex', async () => {
    await expect(
      createChunkPostWithEmbedAttachment(
        'en',
        testSlug,
        {},
        makeFormData({
          embedProvider: 'lichess',
          embedSourceUrl: 'https://lichess.org/embed/abcd1234',
        })
      )
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockEmbedInsertValues).toHaveBeenCalledTimes(1);
    expect(mockEmbedInsertValues.mock.calls[0][0]).toMatchObject({
      embedProvider: 'lichess',
      embedId: 'abcd1234',
      sourceUrl: 'https://lichess.org/embed/abcd1234',
      attributionPlatform: 'lichess',
      attributionPath: '/abcd1234',
    });
  });
});

/**
 * Phase B Tester suite — D8 #42 application-layer exclusivity invariant.
 *
 * The PGN/embed exclusivity invariant is enforced by the Server Action's
 * `afterInsert` defensive check, NOT by a DB constraint. This test pumps
 * the mock to simulate a pre-existing PGN attachment row and confirms
 * the action throws (which surfaces to the user as a transaction
 * rollback / error path).
 */
describe('createChunkPostWithEmbedAttachment — application-layer exclusivity (#42)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetChunkBySlug.mockResolvedValue({ id: 'chunk-1', slug: testSlug });
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockInsertReturning.mockResolvedValue([{ id: generatedPostId }]);
    mockCheckRateLimit.mockResolvedValue({ success: true });
  });

  it('#42 throws when a PGN attachment already exists for the same post (exclusivity invariant)', async () => {
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
          embedProvider: 'lichess',
          embedSourceUrl: 'https://lichess.org/embed/abcd1234',
        })
      )
    ).rejects.toThrow(/PGN\/embed exclusivity/);

    // No embed row was persisted (the throw happened before the insert).
    expect(mockEmbedInsertValues).not.toHaveBeenCalled();
  });
});
