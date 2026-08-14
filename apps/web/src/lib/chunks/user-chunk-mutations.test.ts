import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthenticateAndGuard = vi.fn();
const mockSelectLimit = vi.fn();
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn();
const mockUpdateWhere = vi.fn();
const mockTxUpdateWhere = vi.fn();
const mockTxEditRequestsUpdateWhere = vi.fn();
const mockTxTopicPostsUpdateWhere = vi.fn();
const mockTxDeleteWhere = vi.fn();
const mockTxFeedbackInsertValues = vi.fn();
const mockTxFeedInsertValues = vi.fn();
const mockNotifyFollowersOfNewChunk = vi.fn();
const mockNotifyGameOwnerOfChunkLink = vi.fn();
const mockFindChunkBySlug = vi.fn();
const mockGrantPointsForPost = vi.fn();
const mockClawbackPointsForPost = vi.fn();
const mockLogActivityEvent = vi.fn();
const mockRevalidatePath = vi.fn();
const mockIsUniqueViolation = vi.fn();
const mockLinkNewChunkToGameMove = vi.fn();

vi.mock('@/lib/auth', () => ({
  authenticateAndGuard: (...args: unknown[]) => mockAuthenticateAndGuard(...args),
}));

vi.mock('@/lib/users/activity-log', () => ({
  logActivityEvent: (...args: unknown[]) => mockLogActivityEvent(...args),
}));

vi.mock('@/lib/notifications/notification', () => ({
  notifyFollowersOfNewChunk: (...args: unknown[]) => mockNotifyFollowersOfNewChunk(...args),
}));

vi.mock('@/lib/notifications/game-chunk-link-notification', () => ({
  notifyGameOwnerOfChunkLink: (...args: unknown[]) => mockNotifyGameOwnerOfChunkLink(...args),
}));

vi.mock('@/lib/points', () => ({
  grantPointsForPost: (...args: unknown[]) => mockGrantPointsForPost(...args),
  clawbackPointsForPost: (...args: unknown[]) => mockClawbackPointsForPost(...args),
}));

vi.mock('@/lib/db/game-chunks', () => ({
  linkNewChunkToGameMove: (...args: unknown[]) => mockLinkNewChunkToGameMove(...args),
}));

vi.mock('@/lib/db/extract-pg-error-code', () => ({
  isUniqueViolation: (err: unknown) => mockIsUniqueViolation(err),
}));

vi.mock('@blindfold-chess/features/chess-core', () => ({
  validateFenStructure: (fen: string) => {
    if (typeof fen !== 'string' || fen.trim().length === 0) {
      return { ok: false, error: 'FEN is empty' };
    }
    if (fen === 'invalid-fen') {
      return { ok: false, error: 'FEN must have 6 space-separated fields' };
    }
    return { ok: true };
  },
}));

vi.mock('./queries', () => ({
  findChunkBySlug: (slug: string) => mockFindChunkBySlug(slug),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mockSelectLimit(),
        }),
      }),
    }),
    update: () => ({
      set: (values: unknown) => ({
        where: (...args: unknown[]) => mockUpdateWhere({ values, where: args }),
      }),
    }),
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        insert: (table: { __tableTag?: string }) => ({
          values: (values: unknown) => {
            // Discriminate by table tag so the per-table insert can be
            // asserted independently. The chunks insert returns a
            // `returning()`-able query while the feedback-topics insert
            // returns void; without the split, both end up sharing the
            // same mock and the test for "topics row was written" can't
            // be distinguished from "the chunk was written".
            if (table?.__tableTag === 'chunk_feedback_topics') {
              mockTxFeedbackInsertValues(values);
              return Promise.resolve();
            }
            if (table?.__tableTag === 'feed_items') {
              mockTxFeedInsertValues(values);
              return Promise.resolve();
            }
            mockInsertValues(values);
            return { returning: () => mockInsertReturning() };
          },
        }),
        update: (table: { __tableTag?: string }) => ({
          set: (values: unknown) => ({
            where: (...args: unknown[]) => {
              if (table?.__tableTag === 'chunk_edit_requests') {
                mockTxEditRequestsUpdateWhere({ values, where: args });
                return;
              }
              if (table?.__tableTag === 'topic_posts') {
                mockTxTopicPostsUpdateWhere({ values, where: args });
                return;
              }
              mockTxUpdateWhere({ values, where: args });
            },
          }),
        }),
        delete: (table: { __tableTag?: string }) => ({
          where: (...args: unknown[]) =>
            mockTxDeleteWhere({ table: table?.__tableTag, where: args }),
        }),
      };
      return fn(tx);
    },
  },
  chunks: {
    __tableTag: 'chunks',
    id: 'id',
    userId: 'user_id',
    slug: 'slug',
    title: 'title',
    deletedAt: 'deleted_at',
  },
  chunkEditRequests: {
    __tableTag: 'chunk_edit_requests',
    id: 'id',
    chunkId: 'chunk_id',
    status: 'status',
  },
  topicPosts: {
    __tableTag: 'topic_posts',
    topicType: 'topic_type',
    topicKey: 'topic_key',
  },
  chunkFeedbackTopics: {
    __tableTag: 'chunk_feedback_topics',
    chunkId: 'chunk_id',
    topic: 'topic',
  },
  feedItems: {
    __tableTag: 'feed_items',
    entityType: 'entity_type',
    entityId: 'entity_id',
    actorId: 'actor_id',
    metadata: 'metadata',
  },
}));

vi.mock('@/lib/security/rate-limit', () => ({
  RATE_LIMITS: {
    createChunk: { action: 'create_chunk', maxAttempts: 10, windowMs: 3_600_000 },
    updateChunk: { action: 'update_chunk', maxAttempts: 20, windowMs: 3_600_000 },
    deleteChunk: { action: 'delete_chunk', maxAttempts: 10, windowMs: 3_600_000 },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const TEST_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const TEST_CHUNK_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const TEST_SLUG = 'rook-battery';

const baseCreateInput = {
  representativeFen: VALID_FEN,
  title: 'Rook Battery',
  slug: TEST_SLUG,
  description: 'Doubled rooks on an open file',
  userId: '', // ignored — server overrides with authenticated user
};

describe('createChunkEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockFindChunkBySlug.mockResolvedValue(null);
    mockInsertReturning.mockResolvedValue([{ id: TEST_CHUNK_ID, slug: TEST_SLUG }]);
    mockGrantPointsForPost.mockResolvedValue({
      status: 'granted',
      pointEventId: 'pe-1',
      amount: 3,
      cappedDaily: false,
    });
    mockIsUniqueViolation.mockReturnValue(false);
    mockLinkNewChunkToGameMove.mockResolvedValue(true);
  });

  it('propagates signInRequired from the guard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry(baseCreateInput);

    expect(result).toEqual({ error: 'signInRequired' });
    expect(mockFindChunkBySlug).not.toHaveBeenCalled();
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it('propagates rateLimited from the guard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'rateLimited' });

    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry(baseCreateInput);

    expect(result).toEqual({ error: 'rateLimited' });
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it('returns validation error when FEN is empty', async () => {
    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry({ ...baseCreateInput, representativeFen: '' });

    expect(result).toEqual({ error: 'Representative FEN is required' });
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it('returns validation error when slug is empty', async () => {
    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry({ ...baseCreateInput, slug: '' });

    expect(result).toEqual({ error: 'Slug is required' });
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it('returns slugTaken when preflight finds an existing chunk with that slug', async () => {
    mockFindChunkBySlug.mockResolvedValue({ id: 'other', slug: TEST_SLUG, deletedAt: null });

    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry(baseCreateInput);

    expect(result).toEqual({ error: 'slugTaken' });
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it('returns slugTaken even when the existing chunk is soft-deleted (DB unique includes deleted rows)', async () => {
    mockFindChunkBySlug.mockResolvedValue({
      id: 'other',
      slug: TEST_SLUG,
      deletedAt: new Date('2025-01-01'),
    });

    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry(baseCreateInput);

    expect(result).toEqual({ error: 'slugTaken' });
  });

  it('wraps a PG unique violation from INSERT as slugTaken (race window)', async () => {
    mockInsertReturning.mockRejectedValue(new Error('duplicate'));
    mockIsUniqueViolation.mockReturnValue(true);

    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry(baseCreateInput);

    expect(result).toEqual({ error: 'slugTaken' });
  });

  it('rethrows non-unique-violation errors from INSERT', async () => {
    mockInsertReturning.mockRejectedValue(new Error('disk full'));
    mockIsUniqueViolation.mockReturnValue(false);

    const { createChunkEntry } = await import('./user-chunk-mutations');
    await expect(createChunkEntry(baseCreateInput)).rejects.toThrow('disk full');
  });

  it('inserts with the authenticated userId (ignoring any client-supplied userId)', async () => {
    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry({
      ...baseCreateInput,
      userId: OTHER_USER_ID, // attempt to spoof author
    });

    expect(result).toMatchObject({ success: true, id: TEST_CHUNK_ID, slug: TEST_SLUG });
    expect(mockGrantPointsForPost).toHaveBeenCalledWith(
      expect.anything(),
      TEST_USER_ID, // server-resolved id, not OTHER_USER_ID
      { type: 'chunk', id: TEST_CHUNK_ID }
    );
  });

  it('writes no activity-log row and revalidates nothing', async () => {
    const { createChunkEntry } = await import('./user-chunk-mutations');
    await createChunkEntry(baseCreateInput);

    // The chunks row itself is the durable record of a creation, so it is not
    // duplicated into the activity log. Revalidation is deliberately absent —
    // see the @design note on `dispatchChunkEvent`.
    expect(mockLogActivityEvent).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('returns the point grant amount when grantPointsForPost succeeds', async () => {
    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry(baseCreateInput);

    expect(result).toMatchObject({
      success: true,
      pointGrant: { pointEventId: 'pe-1', amount: 3 },
    });
  });

  it('flags coinCapped with no pointGrant when fully capped out', async () => {
    mockGrantPointsForPost.mockResolvedValue({ status: 'capped' });

    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry(baseCreateInput);

    expect(result).toEqual({
      success: true,
      id: TEST_CHUNK_ID,
      slug: TEST_SLUG,
      coinCapped: true,
    });
  });

  it('omits pointGrant and coinCapped when the grant is skipped', async () => {
    mockGrantPointsForPost.mockResolvedValue({ status: 'skipped' });

    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry(baseCreateInput);

    expect(result).toEqual({ success: true, id: TEST_CHUNK_ID, slug: TEST_SLUG });
  });

  it('inserts feedback topics when creating a draft with topics set', async () => {
    mockInsertReturning.mockResolvedValue([{ id: TEST_CHUNK_ID, slug: TEST_SLUG }]);
    mockFindChunkBySlug.mockResolvedValue(null);
    mockGrantPointsForPost.mockResolvedValue({ status: 'skipped' });

    const { createChunkEntry } = await import('./user-chunk-mutations');
    await createChunkEntry({
      ...baseCreateInput,
      status: 'draft',
      feedbackTopics: ['title', 'description'],
    });

    expect(mockTxFeedbackInsertValues).toHaveBeenCalledTimes(1);
    expect(mockTxFeedbackInsertValues).toHaveBeenCalledWith([
      { chunkId: TEST_CHUNK_ID, topic: 'title' },
      { chunkId: TEST_CHUNK_ID, topic: 'description' },
    ]);
  });

  it('skips the topics insert when the chunk is created as published', async () => {
    // Topics are draft-only signals — creating directly as `published`
    // should bypass the insert so the table stays sparse and never has
    // to be cleared by `publishChunkEntry` for these rows.
    mockInsertReturning.mockResolvedValue([{ id: TEST_CHUNK_ID, slug: TEST_SLUG }]);
    mockFindChunkBySlug.mockResolvedValue(null);
    mockGrantPointsForPost.mockResolvedValue({ status: 'skipped' });

    const { createChunkEntry } = await import('./user-chunk-mutations');
    await createChunkEntry({
      ...baseCreateInput,
      status: 'published',
      feedbackTopics: ['title'],
    });

    expect(mockTxFeedbackInsertValues).not.toHaveBeenCalled();
  });

  it('emits a feed_items row with kind=created when the chunk is created as draft', async () => {
    // Draft creation surfaces in the home feed as a "looking for edit
    // requests" announcement; the publish moment later emits a second
    // feed_items row with kind=published from `publishChunkEntry`.
    mockInsertReturning.mockResolvedValue([{ id: TEST_CHUNK_ID, slug: TEST_SLUG }]);
    mockGrantPointsForPost.mockResolvedValue({ status: 'skipped' });

    const { createChunkEntry } = await import('./user-chunk-mutations');
    await createChunkEntry({ ...baseCreateInput, status: 'draft' });

    expect(mockTxFeedInsertValues).toHaveBeenCalledTimes(1);
    expect(mockTxFeedInsertValues).toHaveBeenCalledWith({
      entityType: 'chunk',
      entityId: TEST_CHUNK_ID,
      actorId: TEST_USER_ID,
      metadata: { kind: 'created', slug: TEST_SLUG },
    });
  });

  it('notifies followers with kind=created when a draft is submitted', async () => {
    mockInsertReturning.mockResolvedValue([{ id: TEST_CHUNK_ID, slug: TEST_SLUG }]);
    mockGrantPointsForPost.mockResolvedValue({ status: 'skipped' });

    const { createChunkEntry } = await import('./user-chunk-mutations');
    await createChunkEntry({ ...baseCreateInput, status: 'draft' });

    expect(mockNotifyFollowersOfNewChunk).toHaveBeenCalledTimes(1);
    expect(mockNotifyFollowersOfNewChunk).toHaveBeenCalledWith({
      actorId: TEST_USER_ID,
      chunkId: TEST_CHUNK_ID,
      slug: TEST_SLUG,
      kind: 'created',
    });
  });

  it('emits a feed_items row with kind=published when the chunk is created directly as published', async () => {
    // A chunk that skips the draft phase has no "created" announcement —
    // the single feed row uses kind=published so the timeline doesn't
    // double-announce the same chunk.
    mockInsertReturning.mockResolvedValue([{ id: TEST_CHUNK_ID, slug: TEST_SLUG }]);
    mockGrantPointsForPost.mockResolvedValue({ status: 'skipped' });

    const { createChunkEntry } = await import('./user-chunk-mutations');
    await createChunkEntry({ ...baseCreateInput, status: 'published' });

    expect(mockTxFeedInsertValues).toHaveBeenCalledTimes(1);
    expect(mockTxFeedInsertValues).toHaveBeenCalledWith({
      entityType: 'chunk',
      entityId: TEST_CHUNK_ID,
      actorId: TEST_USER_ID,
      metadata: { kind: 'published', slug: TEST_SLUG },
    });
  });

  it('skips the topics insert when topics is empty even on draft', async () => {
    // A draft author can legitimately want feedback on nothing; the
    // mutation must avoid the no-op multi-VALUES INSERT in that case.
    mockInsertReturning.mockResolvedValue([{ id: TEST_CHUNK_ID, slug: TEST_SLUG }]);
    mockFindChunkBySlug.mockResolvedValue(null);
    mockGrantPointsForPost.mockResolvedValue({ status: 'skipped' });

    const { createChunkEntry } = await import('./user-chunk-mutations');
    await createChunkEntry({
      ...baseCreateInput,
      status: 'draft',
      feedbackTopics: [],
    });

    expect(mockTxFeedbackInsertValues).not.toHaveBeenCalled();
  });

  // "Create a chunk from this game position": the link rides inside the
  // create transaction so the author never lands on the new chunk with the
  // link left as manual homework.
  describe('game link', () => {
    const GAME_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

    it('links the new chunk to the move and reports it', async () => {
      const { createChunkEntry } = await import('./user-chunk-mutations');
      const result = await createChunkEntry(baseCreateInput, {
        linkTarget: { gameId: GAME_ID, ply: 16 },
      });

      expect(mockLinkNewChunkToGameMove).toHaveBeenCalledWith(expect.anything(), {
        gameId: GAME_ID,
        ply: 16,
        chunkId: TEST_CHUNK_ID,
        // Attribution follows the authenticated user, never the payload's
        // (client-supplied, always-overwritten) `userId`.
        suggestedById: TEST_USER_ID,
      });
      expect(result).toMatchObject({ success: true, linkedToGame: true });
    });

    // Authoring from a game position must reach the owner the same way the
    // per-move picker does — otherwise the flow that creates the most links
    // would be the silent one.
    it("notifies the game's owner when the link lands", async () => {
      const { createChunkEntry } = await import('./user-chunk-mutations');
      await createChunkEntry(baseCreateInput, { linkTarget: { gameId: GAME_ID, ply: 16 } });

      expect(mockNotifyGameOwnerOfChunkLink).toHaveBeenCalledWith({
        actorId: TEST_USER_ID,
        gameId: GAME_ID,
        ply: 16,
        chunkId: TEST_CHUNK_ID,
      });
    });

    it('does not notify when the link was refused', async () => {
      mockLinkNewChunkToGameMove.mockResolvedValue(false);

      const { createChunkEntry } = await import('./user-chunk-mutations');
      await createChunkEntry(baseCreateInput, { linkTarget: { gameId: GAME_ID, ply: 999 } });

      expect(mockNotifyGameOwnerOfChunkLink).not.toHaveBeenCalled();
    });

    it('does not touch game_chunks when no link target is given', async () => {
      const { createChunkEntry } = await import('./user-chunk-mutations');
      const result = await createChunkEntry(baseCreateInput);

      expect(mockLinkNewChunkToGameMove).not.toHaveBeenCalled();
      expect(result).not.toHaveProperty('linkedToGame');
    });

    // The chunk is what the author came to write; the link is the
    // convenience. A refused link (stale game, out-of-range ply) must not
    // cost them the chunk.
    it('still creates the chunk when the link is refused', async () => {
      mockLinkNewChunkToGameMove.mockResolvedValue(false);

      const { createChunkEntry } = await import('./user-chunk-mutations');
      const result = await createChunkEntry(baseCreateInput, {
        linkTarget: { gameId: GAME_ID, ply: 999 },
      });

      expect(result).toMatchObject({ success: true, id: TEST_CHUNK_ID, slug: TEST_SLUG });
      expect(result).not.toHaveProperty('linkedToGame');
    });

    // ply 0 is the game's first move; a truthiness check on the ply
    // instead of the target would silently drop the link there.
    it('links at ply 0', async () => {
      const { createChunkEntry } = await import('./user-chunk-mutations');
      await createChunkEntry(baseCreateInput, { linkTarget: { gameId: GAME_ID, ply: 0 } });

      expect(mockLinkNewChunkToGameMove).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ ply: 0 })
      );
    });
  });
});

describe('updateChunkEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockUpdateWhere.mockResolvedValue(undefined);
    // Default: no slug collision. Tests covering the rename collision
    // path override this per-case.
    mockFindChunkBySlug.mockResolvedValue(null);
    mockIsUniqueViolation.mockReturnValue(false);
  });

  it('propagates signInRequired from the guard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    const result = await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'New title',
      userId: '',
    });

    expect(result).toEqual({ error: 'signInRequired' });
    expect(mockSelectLimit).not.toHaveBeenCalled();
  });

  it('returns notFound when chunk id is missing', async () => {
    const { updateChunkEntry } = await import('./user-chunk-mutations');
    const result = await updateChunkEntry('', {
      representativeFen: VALID_FEN,
      title: 'Title',
      userId: '',
    });

    expect(result).toEqual({ error: 'notFound' });
  });

  it('returns notFound when chunk does not exist', async () => {
    mockSelectLimit.mockResolvedValue([]);

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    const result = await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'Title',
      userId: '',
    });

    expect(result).toEqual({ error: 'notFound' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('returns unauthorized when caller is not the chunk owner', async () => {
    mockSelectLimit.mockResolvedValue([
      { id: TEST_CHUNK_ID, userId: OTHER_USER_ID, slug: TEST_SLUG, deletedAt: null },
    ]);

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    const result = await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'Title',
      userId: '',
    });

    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('returns alreadyDeleted when chunk is soft-deleted', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        deletedAt: new Date('2025-01-01'),
      },
    ]);

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    const result = await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'Title',
      userId: '',
    });

    expect(result).toEqual({ error: 'alreadyDeleted' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('preserves slug when the payload omits it and overwrites userId with the authenticated user', async () => {
    mockSelectLimit.mockResolvedValue([
      { id: TEST_CHUNK_ID, userId: TEST_USER_ID, slug: TEST_SLUG, deletedAt: null },
    ]);

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    const result = await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'New title',
      description: 'updated description',
      userId: 'attempted-spoof', // should be overwritten with the authenticated user
    });

    expect(result).toEqual({ success: true });
    expect(mockTxUpdateWhere).toHaveBeenCalledTimes(1);
    const updateCall = mockTxUpdateWhere.mock.calls[0][0] as { values: Record<string, unknown> };
    expect(updateCall.values).not.toHaveProperty('slug');
    // userId is rewritten — but the helper trims, and the UGC layer
    // overwrites the field with `user.id` BEFORE the helper sees it, so
    // a spoofed value from the client never reaches the DB.
    expect(updateCall.values).toMatchObject({
      title: 'New title',
      description: 'updated description',
      userId: TEST_USER_ID,
    });
    // No slug change → no topic_posts cascade.
    expect(mockTxTopicPostsUpdateWhere).not.toHaveBeenCalled();
  });

  it('preserves slug when the payload echoes the current value (no-op rename)', async () => {
    // The form always carries the current slug; treating echo as a
    // rename would force a needless topic_posts cascade and a
    // slug-collision preflight against the chunk's own slug. The
    // mutation compares trimmed values before deciding to cascade.
    mockSelectLimit.mockResolvedValue([
      { id: TEST_CHUNK_ID, userId: TEST_USER_ID, slug: TEST_SLUG, deletedAt: null },
    ]);

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    const result = await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'Title',
      slug: TEST_SLUG,
      userId: '',
    });

    expect(result).toEqual({ success: true });
    expect(mockFindChunkBySlug).not.toHaveBeenCalled();
    expect(mockTxTopicPostsUpdateWhere).not.toHaveBeenCalled();
  });

  it('renames the slug + cascades to topic_posts when the payload supplies a different slug', async () => {
    mockSelectLimit.mockResolvedValue([
      { id: TEST_CHUNK_ID, userId: TEST_USER_ID, slug: TEST_SLUG, deletedAt: null },
    ]);

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    const result = await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'Title',
      slug: 'kingside-fianchetto',
      userId: '',
    });

    expect(result).toEqual({ success: true });
    // The chunks UPDATE carries the new slug…
    const chunksUpdate = mockTxUpdateWhere.mock.calls[0][0] as {
      values: Record<string, unknown>;
    };
    expect(chunksUpdate.values).toMatchObject({ slug: 'kingside-fianchetto' });
    // …and the discussion-thread cascade rewrites topic_posts.topic_key
    // in the same transaction so existing replies don't orphan.
    expect(mockTxTopicPostsUpdateWhere).toHaveBeenCalledTimes(1);
    const topicPostsUpdate = mockTxTopicPostsUpdateWhere.mock.calls[0][0] as {
      values: Record<string, unknown>;
    };
    expect(topicPostsUpdate.values).toEqual({ topicKey: 'kingside-fianchetto' });
    // Activity-log metadata records the overwritten slug (old → new) for audit.
    expect(mockLogActivityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'update_chunk',
        metadata: expect.objectContaining({
          slug: 'kingside-fianchetto',
          changes: expect.objectContaining({
            slug: { from: TEST_SLUG, to: 'kingside-fianchetto' },
          }),
        }),
      })
    );
  });

  it('returns slugTaken via preflight when the target slug already exists', async () => {
    mockSelectLimit.mockResolvedValue([
      { id: TEST_CHUNK_ID, userId: TEST_USER_ID, slug: TEST_SLUG, deletedAt: null },
    ]);
    mockFindChunkBySlug.mockResolvedValue({ id: 'other-chunk-id', slug: 'taken-slug' });

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    const result = await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'Title',
      slug: 'taken-slug',
      userId: '',
    });

    expect(result).toEqual({ error: 'slugTaken' });
    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
    expect(mockTxTopicPostsUpdateWhere).not.toHaveBeenCalled();
  });

  it('translates a 23505 unique violation during the rename to slugTaken', async () => {
    // Race-window backstop: a second writer could claim the slug
    // between the preflight read and the UPDATE.
    mockSelectLimit.mockResolvedValue([
      { id: TEST_CHUNK_ID, userId: TEST_USER_ID, slug: TEST_SLUG, deletedAt: null },
    ]);
    mockFindChunkBySlug.mockResolvedValue(null);
    mockTxUpdateWhere.mockImplementationOnce(() => {
      throw new Error('duplicate key value');
    });
    mockIsUniqueViolation.mockReturnValue(true);

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    const result = await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'Title',
      slug: 'racey-slug',
      userId: '',
    });

    expect(result).toEqual({ error: 'slugTaken' });
  });

  it('logs an update_chunk event with overwritten field values, revalidating nothing', async () => {
    // The pre-update row carries the prior values; an in-place edit overwrites
    // them with no revision history, so the activity log captures old → new.
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        deletedAt: null,
        title: 'Old Title',
        description: 'Old Desc',
        representativeFen: 'old-fen',
      },
    ]);

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'Title',
      userId: '',
    });

    expect(mockLogActivityEvent).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      action: 'update_chunk',
      targetType: 'chunk',
      targetId: TEST_CHUNK_ID,
      metadata: {
        slug: TEST_SLUG,
        changes: {
          title: { from: 'Old Title', to: 'Title' },
          description: { from: 'Old Desc', to: null },
          representativeFen: { from: 'old-fen', to: VALID_FEN },
        },
      },
    });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('resets the feedback topics row set in the same transaction as the update', async () => {
    // The author can both add and remove topics by ticking checkboxes
    // before saving — the mutation expresses that as "DELETE all + INSERT
    // new" so the resulting row set always matches the payload exactly,
    // without the caller needing to compute a diff.
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        status: 'draft',
        deletedAt: null,
      },
    ]);

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'New title',
      userId: '',
      feedbackTopics: ['title'],
    });

    expect(mockTxDeleteWhere).toHaveBeenCalledWith(
      expect.objectContaining({ table: 'chunk_feedback_topics' })
    );
    expect(mockTxFeedbackInsertValues).toHaveBeenCalledWith([
      { chunkId: TEST_CHUNK_ID, topic: 'title' },
    ]);
  });

  it('clears feedback topics when payload omits topics (undefined → preserve, [] → wipe)', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        status: 'draft',
        deletedAt: null,
      },
    ]);

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'New title',
      userId: '',
      feedbackTopics: [],
    });

    // Empty array is an explicit "no topics" intent — DELETE fires,
    // INSERT does not (no rows to write).
    expect(mockTxDeleteWhere).toHaveBeenCalledWith(
      expect.objectContaining({ table: 'chunk_feedback_topics' })
    );
    expect(mockTxFeedbackInsertValues).not.toHaveBeenCalled();
  });

  it('leaves feedback topics untouched when payload omits the field entirely', async () => {
    // `undefined` (field absent) means the caller has nothing to say
    // about topics — preserve whatever the row currently has. This keeps
    // the field optional for callers that never opted in.
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        status: 'draft',
        deletedAt: null,
      },
    ]);

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'New title',
      userId: '',
    });

    expect(mockTxDeleteWhere).not.toHaveBeenCalled();
    expect(mockTxFeedbackInsertValues).not.toHaveBeenCalled();
  });
});

describe('deleteChunkEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockTxUpdateWhere.mockResolvedValue(undefined);
  });

  it('propagates signInRequired from the guard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { deleteChunkEntry } = await import('./user-chunk-mutations');
    const result = await deleteChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ error: 'signInRequired' });
    expect(mockSelectLimit).not.toHaveBeenCalled();
  });

  it('returns notFound when chunk id is empty', async () => {
    const { deleteChunkEntry } = await import('./user-chunk-mutations');
    const result = await deleteChunkEntry('');
    expect(result).toEqual({ error: 'notFound' });
  });

  it('returns notFound when chunk does not exist', async () => {
    mockSelectLimit.mockResolvedValue([]);

    const { deleteChunkEntry } = await import('./user-chunk-mutations');
    const result = await deleteChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ error: 'notFound' });
    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
  });

  it('returns unauthorized when caller is not the chunk owner', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: OTHER_USER_ID,
        slug: TEST_SLUG,
        title: 'Rook Battery',
        deletedAt: null,
      },
    ]);

    const { deleteChunkEntry } = await import('./user-chunk-mutations');
    const result = await deleteChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
  });

  it('returns alreadyDeleted when chunk is already soft-deleted', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        title: 'Rook Battery',
        deletedAt: new Date('2025-01-01'),
      },
    ]);

    const { deleteChunkEntry } = await import('./user-chunk-mutations');
    const result = await deleteChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ error: 'alreadyDeleted' });
    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
  });

  it('soft-deletes the chunk and runs point clawback inside the transaction', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        title: 'Rook Battery',
        deletedAt: null,
      },
    ]);

    const { deleteChunkEntry } = await import('./user-chunk-mutations');
    const result = await deleteChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ success: true });
    expect(mockTxUpdateWhere).toHaveBeenCalledTimes(1);
    const updateCall = mockTxUpdateWhere.mock.calls[0][0] as { values: Record<string, unknown> };
    expect(updateCall.values).toHaveProperty('deletedAt');
    expect(mockClawbackPointsForPost).toHaveBeenCalledWith(expect.anything(), TEST_USER_ID, {
      type: 'chunk',
      id: TEST_CHUNK_ID,
    });
  });

  it('does not write an activity-log row on delete (soft-delete row is the record)', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        title: 'Rook Battery',
        deletedAt: null,
      },
    ]);

    const { deleteChunkEntry } = await import('./user-chunk-mutations');
    await deleteChunkEntry(TEST_CHUNK_ID);

    // delete_chunk is a soft-delete (deletedAt), so the chunks row survives as
    // the durable record; it is not duplicated into the activity log.
    expect(mockLogActivityEvent).not.toHaveBeenCalled();
  });

  it('auto-rejects any still-pending edit requests on delete', async () => {
    // Soft delete makes the chunk's /edit-requests page 404, which
    // would strand pending rows with no path to resolve. The delete
    // transaction sweeps them to 'rejected' in the same step.
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        title: 'Rook Battery',
        deletedAt: null,
      },
    ]);

    const { deleteChunkEntry } = await import('./user-chunk-mutations');
    await deleteChunkEntry(TEST_CHUNK_ID);

    expect(mockTxEditRequestsUpdateWhere).toHaveBeenCalledTimes(1);
    const update = mockTxEditRequestsUpdateWhere.mock.calls[0][0] as {
      values: Record<string, unknown>;
    };
    expect(update.values).toMatchObject({
      status: 'rejected',
      resolverId: TEST_USER_ID,
    });
  });
});

describe('createChunkEntry — status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockFindChunkBySlug.mockResolvedValue(null);
    mockInsertReturning.mockResolvedValue([{ id: TEST_CHUNK_ID, slug: TEST_SLUG }]);
    mockGrantPointsForPost.mockResolvedValue({ status: 'skipped' });
    mockIsUniqueViolation.mockReturnValue(false);
  });

  it('persists an explicit status="draft" through to the INSERT', async () => {
    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry({ ...baseCreateInput, status: 'draft' });

    expect(result).toMatchObject({ success: true, id: TEST_CHUNK_ID, slug: TEST_SLUG });
    expect(mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }));
  });

  it('defaults to "published" when the caller omits status', async () => {
    const { createChunkEntry } = await import('./user-chunk-mutations');
    await createChunkEntry(baseCreateInput);

    expect(mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({ status: 'published' }));
  });

  it('rejects publish-on-create with an empty description (descriptionRequired)', async () => {
    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry({
      ...baseCreateInput,
      status: 'published',
      description: '   ',
    });

    expect(result).toEqual({ error: 'descriptionRequired' });
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it('allows creating a draft with an empty description', async () => {
    const { createChunkEntry } = await import('./user-chunk-mutations');
    const result = await createChunkEntry({
      ...baseCreateInput,
      status: 'draft',
      description: '',
    });

    expect(result).toMatchObject({ success: true });
    expect(mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }));
  });
});

describe('updateChunkEntry — published lock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockUpdateWhere.mockResolvedValue(undefined);
  });

  it('returns cannotEditPublished when the chunk is already published', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        status: 'published',
        deletedAt: null,
      },
    ]);

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    const result = await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'New title',
      userId: '',
    });

    expect(result).toEqual({ error: 'cannotEditPublished' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('accepts updates when the chunk is still a draft', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        status: 'draft',
        deletedAt: null,
      },
    ]);

    const { updateChunkEntry } = await import('./user-chunk-mutations');
    const result = await updateChunkEntry(TEST_CHUNK_ID, {
      representativeFen: VALID_FEN,
      title: 'New title',
      userId: '',
    });

    expect(result).toEqual({ success: true });
    expect(mockTxUpdateWhere).toHaveBeenCalledTimes(1);
  });
});

describe('publishChunkEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockTxUpdateWhere.mockResolvedValue(undefined);
  });

  it('transitions a draft chunk with a description to published', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        description: 'Doubled rooks on an open file',
        status: 'draft',
        deletedAt: null,
      },
    ]);

    const { publishChunkEntry } = await import('./user-chunk-mutations');
    const result = await publishChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ success: true });
    expect(mockTxUpdateWhere).toHaveBeenCalledTimes(1);
    const args = mockTxUpdateWhere.mock.calls[0][0] as { values: Record<string, unknown> };
    expect(args.values).toMatchObject({ status: 'published' });
    // The publish transition stamps `published_at`. The exact value
    // is a fresh Date so a `Date` instance match is enough — we
    // don't pin the millisecond.
    expect(args.values.publishedAt).toBeInstanceOf(Date);
    // Publishing wipes any previously-set feedback topics — they are
    // draft-only signals and must not survive into the canonical state.
    expect(mockTxDeleteWhere).toHaveBeenCalledWith(
      expect.objectContaining({ table: 'chunk_feedback_topics' })
    );
    // Publishing auto-rejects any still-pending edit requests so
    // they don't strand behind the now-inaccessible review UI.
    expect(mockTxEditRequestsUpdateWhere).toHaveBeenCalledTimes(1);
    const editRequestsUpdate = mockTxEditRequestsUpdateWhere.mock.calls[0][0] as {
      values: Record<string, unknown>;
    };
    expect(editRequestsUpdate.values).toMatchObject({
      status: 'rejected',
      resolverId: TEST_USER_ID,
    });
    // No activity-log row for publishing: it is derivable from the chunks row
    // itself (`status='published'` + `publishedAt`).
    expect(mockLogActivityEvent).not.toHaveBeenCalled();
    // Publish emits a kind=published feed row alongside the draft's
    // earlier kind=created row, giving the home timeline two distinct
    // surface points for the same chunk.
    expect(mockTxFeedInsertValues).toHaveBeenCalledTimes(1);
    expect(mockTxFeedInsertValues).toHaveBeenCalledWith({
      entityType: 'chunk',
      entityId: TEST_CHUNK_ID,
      actorId: TEST_USER_ID,
      metadata: { kind: 'published', slug: TEST_SLUG },
    });
    // Publish also notifies followers — they get a second notification
    // for the same chunk, framed as a publish event rather than a
    // draft submission.
    expect(mockNotifyFollowersOfNewChunk).toHaveBeenCalledTimes(1);
    expect(mockNotifyFollowersOfNewChunk).toHaveBeenCalledWith({
      actorId: TEST_USER_ID,
      chunkId: TEST_CHUNK_ID,
      slug: TEST_SLUG,
      kind: 'published',
    });
  });

  it('idempotent when already published (no write, no log)', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        description: 'Doubled rooks',
        status: 'published',
        deletedAt: null,
      },
    ]);

    const { publishChunkEntry } = await import('./user-chunk-mutations');
    const result = await publishChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ success: true });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
    expect(mockLogActivityEvent).not.toHaveBeenCalled();
  });

  it('returns descriptionRequired when the draft has no description', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        description: null,
        status: 'draft',
        deletedAt: null,
      },
    ]);

    const { publishChunkEntry } = await import('./user-chunk-mutations');
    const result = await publishChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ error: 'descriptionRequired' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('returns descriptionRequired when the draft description is whitespace-only', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        description: '   \n  ',
        status: 'draft',
        deletedAt: null,
      },
    ]);

    const { publishChunkEntry } = await import('./user-chunk-mutations');
    const result = await publishChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ error: 'descriptionRequired' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('rejects publishing for non-owners', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: OTHER_USER_ID,
        slug: TEST_SLUG,
        description: 'X',
        status: 'draft',
        deletedAt: null,
      },
    ]);

    const { publishChunkEntry } = await import('./user-chunk-mutations');
    const result = await publishChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('rejects publishing for soft-deleted chunks', async () => {
    mockSelectLimit.mockResolvedValue([
      {
        id: TEST_CHUNK_ID,
        userId: TEST_USER_ID,
        slug: TEST_SLUG,
        description: 'X',
        status: 'draft',
        deletedAt: new Date('2025-01-01'),
      },
    ]);

    const { publishChunkEntry } = await import('./user-chunk-mutations');
    const result = await publishChunkEntry(TEST_CHUNK_ID);

    expect(result).toEqual({ error: 'alreadyDeleted' });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('propagates signInRequired from the guard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { publishChunkEntry } = await import('./user-chunk-mutations');
    expect(await publishChunkEntry(TEST_CHUNK_ID)).toEqual({ error: 'signInRequired' });
    expect(mockSelectLimit).not.toHaveBeenCalled();
  });
});
