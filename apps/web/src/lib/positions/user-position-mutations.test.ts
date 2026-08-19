import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit tests for the shared position CRUD cores. Mirrors the mock harness of
 * `lib/chunks/user-chunk-mutations.test.ts` — the deliberately parallel
 * chunk module — with the positions-specific concerns added on top: the
 * `positions.type` kind discriminator, fork-source resolution, tag
 * validation / writes, follower notifications and post-commit rank
 * evaluation.
 */

const mockAuthenticateAndGuard = vi.fn();
const mockSelectLimit = vi.fn();
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn();
const mockTxUpdateWhere = vi.fn();
const mockTxFeedInsertValues = vi.fn();
const mockTxRevisionInsertValues = vi.fn();
const mockValidateForkSource = vi.fn();
const mockValidateAndDedupeTagIds = vi.fn();
const mockInsertPositionTags = vi.fn();
const mockReplacePositionTags = vi.fn();
const mockGrantPointsForPost = vi.fn();
const mockClawbackPointsForPost = vi.fn();
const mockNotifyFollowersOfNewPosition = vi.fn();
const mockNotifyPositionForked = vi.fn();
const mockEvaluateRanksAfterCreate = vi.fn();
const mockLogActivityEvent = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

// Cuts the request-layer cookie chain (next/headers, billing, grants) out of
// this mutation-focused test; the helper itself is unit-tested in
// `@/lib/ads/ads-hidden-cookie-writer.test.ts`.
vi.mock('@/lib/ads/ads-hidden-cookie-writer', () => ({
  refreshAdsHiddenCookieOnDanPromotion: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authenticateAndGuard: (...args: unknown[]) => mockAuthenticateAndGuard(...args),
}));

vi.mock('@/lib/db/rank-evaluation', () => ({
  evaluateRanksAfterCreate: (...args: unknown[]) => mockEvaluateRanksAfterCreate(...args),
}));

vi.mock('@/lib/notifications/notification', () => ({
  notifyFollowersOfNewPosition: (...args: unknown[]) => mockNotifyFollowersOfNewPosition(...args),
  notifyPositionForked: (...args: unknown[]) => mockNotifyPositionForked(...args),
}));

vi.mock('@/lib/points', () => ({
  grantPointsForPost: (...args: unknown[]) => mockGrantPointsForPost(...args),
  clawbackPointsForPost: (...args: unknown[]) => mockClawbackPointsForPost(...args),
}));

vi.mock('@/lib/positions/fork', () => ({
  validateForkSource: (...args: unknown[]) => mockValidateForkSource(...args),
  PUZZLE_FORK_SOURCE_TYPES: ['puzzle', 'memory'],
  POSITION_FORK_SOURCE_TYPES: ['memory'],
}));

vi.mock('@/lib/positions/tag-validation', () => ({
  validateAndDedupeTagIds: (...args: unknown[]) => mockValidateAndDedupeTagIds(...args),
}));

vi.mock('@/lib/positions/tag-writes', () => ({
  insertPositionTags: (...args: unknown[]) => mockInsertPositionTags(...args),
  replacePositionTags: (...args: unknown[]) => mockReplacePositionTags(...args),
}));

vi.mock('@/lib/users/activity-log', () => ({
  logActivityEvent: (...args: unknown[]) => mockLogActivityEvent(...args),
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
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        insert: (table: { __tableTag?: string }) => ({
          values: (values: unknown) => {
            // Discriminate by table tag so the positions insert (which the
            // create path `returning()`s) can be asserted independently of
            // the feed_items insert.
            if (table?.__tableTag === 'feed_items') {
              mockTxFeedInsertValues(values);
              return Promise.resolve();
            }
            if (table?.__tableTag === 'position_content_revisions') {
              mockTxRevisionInsertValues(values);
              return Promise.resolve();
            }
            mockInsertValues(values);
            return { returning: () => mockInsertReturning() };
          },
        }),
        update: () => ({
          set: (values: unknown) => ({
            where: (...args: unknown[]) => mockTxUpdateWhere({ values, where: args }),
          }),
        }),
      };
      return fn(tx);
    },
  },
  positions: {
    __tableTag: 'positions',
    id: 'id',
    userId: 'user_id',
    type: 'type',
    deletedAt: 'deleted_at',
    fen: 'fen',
    title: 'title',
    description: 'description',
  },
  feedItems: {
    __tableTag: 'feed_items',
    entityType: 'entity_type',
    entityId: 'entity_id',
    actorId: 'actor_id',
    metadata: 'metadata',
  },
  positionContentRevisions: {
    __tableTag: 'position_content_revisions',
    positionId: 'position_id',
    editorId: 'editor_id',
    changes: 'changes',
  },
}));

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const TEST_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const TEST_POSITION_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const FORK_SOURCE_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const RATE_LIMIT = { action: 'test_positions', maxAttempts: 10, windowMs: 3_600_000 };

const baseCreateParams = {
  kind: 'memory' as const,
  rateLimit: RATE_LIMIT,
  data: {
    fen: VALID_FEN,
    title: 'Greek Gift setup',
  },
  validate: () => null,
};

describe('createPositionEntry', () => {
  beforeEach(() => {
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockValidateAndDedupeTagIds.mockResolvedValue({
      ok: true,
      deduped: { themeIds: undefined, chunkIds: undefined },
    });
    mockInsertReturning.mockResolvedValue([{ id: TEST_POSITION_ID }]);
    mockGrantPointsForPost.mockResolvedValue({ status: 'skipped' });
    mockEvaluateRanksAfterCreate.mockResolvedValue([]);
  });

  it('propagates signInRequired from the guard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { createPositionEntry } = await import('./user-position-mutations');
    const result = await createPositionEntry(baseCreateParams);

    expect(result).toEqual({ error: 'signInRequired' });
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it('returns the error from the caller-supplied validate callback', async () => {
    const { createPositionEntry } = await import('./user-position-mutations');
    const result = await createPositionEntry({
      ...baseCreateParams,
      validate: () => 'fenInvalid',
    });

    expect(result).toEqual({ error: 'fenInvalid' });
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it('maps a failed fork-source validation to a fork_source_* error', async () => {
    mockValidateForkSource.mockResolvedValue({ ok: false, reason: 'forks_disabled' });

    const { createPositionEntry } = await import('./user-position-mutations');
    const result = await createPositionEntry({
      ...baseCreateParams,
      data: { ...baseCreateParams.data, forkedFromId: FORK_SOURCE_ID },
    });

    expect(result).toEqual({ error: 'fork_source_forks_disabled' });
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it('persists the resolved fork source id when fork validation succeeds', async () => {
    mockValidateForkSource.mockResolvedValue({
      ok: true,
      source: { id: FORK_SOURCE_ID, userId: OTHER_USER_ID, title: 'Original' },
    });

    const { createPositionEntry } = await import('./user-position-mutations');
    const result = await createPositionEntry({
      ...baseCreateParams,
      data: { ...baseCreateParams.data, forkedFromId: FORK_SOURCE_ID },
    });

    expect(result).toMatchObject({ success: true, id: TEST_POSITION_ID });
    expect(mockValidateForkSource).toHaveBeenCalledWith({
      forkedFromId: FORK_SOURCE_ID,
      currentUserId: TEST_USER_ID,
      sourceTypes: ['memory'],
    });
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ forkedFromId: FORK_SOURCE_ID })
    );
  });

  it('allows a puzzle to be created from a memory-type fork source', async () => {
    mockValidateForkSource.mockResolvedValue({
      ok: true,
      source: {
        id: FORK_SOURCE_ID,
        userId: OTHER_USER_ID,
        title: 'Original memory position',
        type: 'memory',
      },
    });

    const { createPositionEntry } = await import('./user-position-mutations');
    await createPositionEntry({
      ...baseCreateParams,
      kind: 'puzzle',
      data: { ...baseCreateParams.data, forkedFromId: FORK_SOURCE_ID },
    });

    expect(mockValidateForkSource).toHaveBeenCalledWith({
      forkedFromId: FORK_SOURCE_ID,
      currentUserId: TEST_USER_ID,
      sourceTypes: ['puzzle', 'memory'],
    });
  });

  describe('notifyPositionForked', () => {
    it('notifies the fork source owner with sourceType "memory" when a puzzle is created from a position-memory entry', async () => {
      mockValidateForkSource.mockResolvedValue({
        ok: true,
        source: { id: FORK_SOURCE_ID, userId: OTHER_USER_ID, title: 'Original', type: 'memory' },
      });

      const { createPositionEntry } = await import('./user-position-mutations');
      await createPositionEntry({
        ...baseCreateParams,
        kind: 'puzzle',
        data: { ...baseCreateParams.data, forkedFromId: FORK_SOURCE_ID },
      });

      expect(mockNotifyPositionForked).toHaveBeenCalledWith({
        actorId: TEST_USER_ID,
        ownerId: OTHER_USER_ID,
        newPositionId: TEST_POSITION_ID,
        outputType: 'puzzle',
        sourceType: 'memory',
      });
    });

    it('notifies with sourceType "puzzle" for a same-type puzzle fork', async () => {
      mockValidateForkSource.mockResolvedValue({
        ok: true,
        source: { id: FORK_SOURCE_ID, userId: OTHER_USER_ID, title: 'Original', type: 'puzzle' },
      });

      const { createPositionEntry } = await import('./user-position-mutations');
      await createPositionEntry({
        ...baseCreateParams,
        kind: 'puzzle',
        data: { ...baseCreateParams.data, forkedFromId: FORK_SOURCE_ID },
      });

      expect(mockNotifyPositionForked).toHaveBeenCalledWith(
        expect.objectContaining({ outputType: 'puzzle', sourceType: 'puzzle' })
      );
    });

    it('notifies with outputType "memory" for a same-type position-memory fork', async () => {
      mockValidateForkSource.mockResolvedValue({
        ok: true,
        source: { id: FORK_SOURCE_ID, userId: OTHER_USER_ID, title: 'Original', type: 'memory' },
      });

      const { createPositionEntry } = await import('./user-position-mutations');
      await createPositionEntry({
        ...baseCreateParams,
        kind: 'memory',
        data: { ...baseCreateParams.data, forkedFromId: FORK_SOURCE_ID },
      });

      expect(mockNotifyPositionForked).toHaveBeenCalledWith({
        actorId: TEST_USER_ID,
        ownerId: OTHER_USER_ID,
        newPositionId: TEST_POSITION_ID,
        outputType: 'memory',
        sourceType: 'memory',
      });
    });

    it('does not notify on a self-fork (source owner is the creator)', async () => {
      mockValidateForkSource.mockResolvedValue({
        ok: true,
        source: {
          id: FORK_SOURCE_ID,
          userId: TEST_USER_ID,
          title: 'My own puzzle',
          type: 'puzzle',
        },
      });

      const { createPositionEntry } = await import('./user-position-mutations');
      await createPositionEntry({
        ...baseCreateParams,
        kind: 'puzzle',
        data: { ...baseCreateParams.data, forkedFromId: FORK_SOURCE_ID },
      });

      expect(mockNotifyPositionForked).not.toHaveBeenCalled();
    });

    it('does not notify when the fork source owner was anonymised (userId null)', async () => {
      mockValidateForkSource.mockResolvedValue({
        ok: true,
        source: { id: FORK_SOURCE_ID, userId: null, title: 'Orphaned source', type: 'puzzle' },
      });

      const { createPositionEntry } = await import('./user-position-mutations');
      await createPositionEntry({
        ...baseCreateParams,
        kind: 'puzzle',
        data: { ...baseCreateParams.data, forkedFromId: FORK_SOURCE_ID },
      });

      expect(mockNotifyPositionForked).not.toHaveBeenCalled();
    });

    it('does not notify when the create has no fork source at all', async () => {
      const { createPositionEntry } = await import('./user-position-mutations');
      await createPositionEntry({ ...baseCreateParams, kind: 'puzzle' });

      expect(mockNotifyPositionForked).not.toHaveBeenCalled();
    });
  });

  it('propagates tag validation errors', async () => {
    mockValidateAndDedupeTagIds.mockResolvedValue({ ok: false, error: 'invalidTheme' });

    const { createPositionEntry } = await import('./user-position-mutations');
    const result = await createPositionEntry(baseCreateParams);

    expect(result).toEqual({ error: 'invalidTheme' });
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it('inserts trimmed fields with the authenticated user and the kind discriminator', async () => {
    const { createPositionEntry } = await import('./user-position-mutations');
    const result = await createPositionEntry({
      ...baseCreateParams,
      data: {
        fen: `  ${VALID_FEN}  `,
        title: '  Greek Gift setup  ',
        description: '   ',
      },
    });

    expect(result).toMatchObject({ success: true, id: TEST_POSITION_ID });
    expect(mockInsertValues).toHaveBeenCalledWith({
      fen: VALID_FEN,
      title: 'Greek Gift setup',
      // Whitespace-only description normalizes to null.
      description: null,
      userId: TEST_USER_ID,
      type: 'memory',
      forkedFromId: null,
    });
  });

  it('runs extra writes and tag inserts inside the transaction, keyed by the new id', async () => {
    const applyExtraWrites = vi.fn();
    mockValidateAndDedupeTagIds.mockResolvedValue({
      ok: true,
      deduped: { themeIds: ['theme-1'], chunkIds: ['chunk-1'] },
    });

    const { createPositionEntry } = await import('./user-position-mutations');
    await createPositionEntry({ ...baseCreateParams, applyExtraWrites });

    expect(applyExtraWrites).toHaveBeenCalledWith(expect.anything(), TEST_POSITION_ID);
    expect(mockInsertPositionTags).toHaveBeenCalledWith(
      expect.anything(),
      TEST_POSITION_ID,
      TEST_USER_ID,
      ['theme-1'],
      ['chunk-1']
    );
  });

  it('emits a feed_items row and notifies followers with the position type', async () => {
    const { createPositionEntry } = await import('./user-position-mutations');
    await createPositionEntry(baseCreateParams);

    expect(mockTxFeedInsertValues).toHaveBeenCalledWith({
      entityType: 'position',
      entityId: TEST_POSITION_ID,
      actorId: TEST_USER_ID,
      metadata: { type: 'memory' },
    });
    expect(mockNotifyFollowersOfNewPosition).toHaveBeenCalledWith({
      actorId: TEST_USER_ID,
      positionId: TEST_POSITION_ID,
      positionType: 'memory',
    });
  });

  it('returns the point grant when fully granted (no cap flag)', async () => {
    mockGrantPointsForPost.mockResolvedValue({
      status: 'granted',
      pointEventId: 'pe-1',
      amount: 3,
      cappedDaily: false,
    });

    const { createPositionEntry } = await import('./user-position-mutations');
    const granted = await createPositionEntry(baseCreateParams);
    expect(granted).toMatchObject({
      success: true,
      pointGrant: { pointEventId: 'pe-1', amount: 3 },
    });
    expect(granted).toMatchObject({ coinCapped: false });
    expect(mockGrantPointsForPost).toHaveBeenCalledWith(expect.anything(), TEST_USER_ID, {
      type: 'position_memory',
      id: TEST_POSITION_ID,
    });
  });

  it('flags coinCapped alongside a partial grant (cappedDaily)', async () => {
    mockGrantPointsForPost.mockResolvedValue({
      status: 'granted',
      pointEventId: 'pe-1',
      amount: 1,
      cappedDaily: true,
    });

    const { createPositionEntry } = await import('./user-position-mutations');
    const result = await createPositionEntry(baseCreateParams);
    expect(result).toMatchObject({
      success: true,
      pointGrant: { pointEventId: 'pe-1', amount: 1 },
      coinCapped: true,
    });
  });

  it('flags coinCapped with a null pointGrant when fully capped out', async () => {
    mockGrantPointsForPost.mockResolvedValue({ status: 'capped' });

    const { createPositionEntry } = await import('./user-position-mutations');
    const capped = await createPositionEntry(baseCreateParams);
    expect(capped).toEqual({
      success: true,
      id: TEST_POSITION_ID,
      pointGrant: null,
      coinCapped: true,
    });
  });

  it('reports no grant and no cap when the grant is skipped', async () => {
    mockGrantPointsForPost.mockResolvedValue({ status: 'skipped' });

    const { createPositionEntry } = await import('./user-position-mutations');
    const skipped = await createPositionEntry(baseCreateParams);
    expect(skipped).toEqual({
      success: true,
      id: TEST_POSITION_ID,
      pointGrant: null,
      coinCapped: false,
    });
  });

  it('surfaces granted belt ranks from the post-commit evaluation', async () => {
    const grantedRank = { slug: '2kyu', name: '2kyu' };
    mockEvaluateRanksAfterCreate.mockResolvedValue([grantedRank]);

    const { createPositionEntry } = await import('./user-position-mutations');
    const result = await createPositionEntry(baseCreateParams);

    expect(mockEvaluateRanksAfterCreate).toHaveBeenCalledWith(TEST_USER_ID, 'position create');
    expect(result).toMatchObject({ success: true, grantedRanks: [grantedRank] });
  });

  // Revalidation is deliberately absent — every practice route is dynamic and
  // the preview clients `router.push` to the new detail page on success.
  it("uses the kind's own segment and point type, revalidating nothing", async () => {
    const { createPositionEntry } = await import('./user-position-mutations');
    await createPositionEntry({ ...baseCreateParams, kind: 'puzzle' });

    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({ type: 'puzzle' }));
    expect(mockGrantPointsForPost).toHaveBeenCalledWith(expect.anything(), TEST_USER_ID, {
      type: 'puzzle',
      id: TEST_POSITION_ID,
    });
  });
});

const baseUpdateParams = {
  kind: 'memory' as const,
  rateLimit: RATE_LIMIT,
  data: {
    id: TEST_POSITION_ID,
    fen: VALID_FEN,
    title: 'Updated title',
  },
  validate: () => null,
};

const ownedRow = {
  id: TEST_POSITION_ID,
  userId: TEST_USER_ID,
  type: 'memory',
  deletedAt: null,
  fen: 'old-fen',
  title: 'Old title',
  description: 'Old description',
};

describe('updatePositionEntry', () => {
  beforeEach(() => {
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockValidateAndDedupeTagIds.mockResolvedValue({
      ok: true,
      deduped: { themeIds: undefined, chunkIds: undefined },
    });
    mockSelectLimit.mockResolvedValue([ownedRow]);
  });

  it('propagates signInRequired from the guard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { updatePositionEntry } = await import('./user-position-mutations');
    const result = await updatePositionEntry(baseUpdateParams);

    expect(result).toEqual({ error: 'signInRequired' });
    expect(mockSelectLimit).not.toHaveBeenCalled();
  });

  it('returns the error from the caller-supplied validate callback', async () => {
    const { updatePositionEntry } = await import('./user-position-mutations');
    const result = await updatePositionEntry({
      ...baseUpdateParams,
      validate: () => 'titleRequired',
    });

    expect(result).toEqual({ error: 'titleRequired' });
    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
  });

  it('returns notFound when the position does not exist', async () => {
    mockSelectLimit.mockResolvedValue([]);

    const { updatePositionEntry } = await import('./user-position-mutations');
    const result = await updatePositionEntry(baseUpdateParams);

    expect(result).toEqual({ error: 'notFound' });
    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
  });

  it('returns notFound when the row is of a different kind (id of the wrong type must look nonexistent)', async () => {
    mockSelectLimit.mockResolvedValue([{ ...ownedRow, type: 'puzzle' }]);

    const { updatePositionEntry } = await import('./user-position-mutations');
    const result = await updatePositionEntry(baseUpdateParams);

    expect(result).toEqual({ error: 'notFound' });
    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
  });

  it('returns unauthorized when the caller is not the owner', async () => {
    mockSelectLimit.mockResolvedValue([{ ...ownedRow, userId: OTHER_USER_ID }]);

    const { updatePositionEntry } = await import('./user-position-mutations');
    const result = await updatePositionEntry(baseUpdateParams);

    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
  });

  it('returns alreadyDeleted when the position is soft-deleted', async () => {
    mockSelectLimit.mockResolvedValue([{ ...ownedRow, deletedAt: new Date('2025-01-01') }]);

    const { updatePositionEntry } = await import('./user-position-mutations');
    const result = await updatePositionEntry(baseUpdateParams);

    expect(result).toEqual({ error: 'alreadyDeleted' });
    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
  });

  it('propagates tag validation errors', async () => {
    mockValidateAndDedupeTagIds.mockResolvedValue({ ok: false, error: 'invalidChunk' });

    const { updatePositionEntry } = await import('./user-position-mutations');
    const result = await updatePositionEntry(baseUpdateParams);

    expect(result).toEqual({ error: 'invalidChunk' });
    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
  });

  it('writes trimmed values, replaces tags and runs extra writes in the transaction', async () => {
    const applyExtraWrites = vi.fn();
    mockValidateAndDedupeTagIds.mockResolvedValue({
      ok: true,
      deduped: { themeIds: ['theme-1'], chunkIds: undefined },
    });

    const { updatePositionEntry } = await import('./user-position-mutations');
    const result = await updatePositionEntry({
      ...baseUpdateParams,
      data: {
        id: TEST_POSITION_ID,
        fen: `  ${VALID_FEN} `,
        title: ' Updated title ',
        description: '',
      },
      applyExtraWrites,
    });

    expect(result).toEqual({ success: true });
    expect(mockTxUpdateWhere).toHaveBeenCalledTimes(1);
    const updateCall = mockTxUpdateWhere.mock.calls[0][0] as { values: Record<string, unknown> };
    expect(updateCall.values).toEqual({
      fen: VALID_FEN,
      title: 'Updated title',
      description: null,
    });
    expect(applyExtraWrites).toHaveBeenCalledWith(expect.anything(), TEST_POSITION_ID);
    expect(mockReplacePositionTags).toHaveBeenCalledWith(
      expect.anything(),
      TEST_POSITION_ID,
      TEST_USER_ID,
      ['theme-1'],
      undefined
    );
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('logs an update activity event with old → new changes', async () => {
    const { updatePositionEntry } = await import('./user-position-mutations');
    await updatePositionEntry(baseUpdateParams);

    expect(mockLogActivityEvent).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      action: 'update_position',
      targetType: 'position',
      targetId: TEST_POSITION_ID,
      metadata: {
        type: 'memory',
        changes: {
          fen: { from: 'old-fen', to: VALID_FEN },
          title: { from: 'Old title', to: 'Updated title' },
          description: { from: 'Old description', to: null },
        },
      },
    });
  });

  it('inserts a position_content_revisions row (inside the transaction) with the same changes plus any extra diff', async () => {
    const applyExtraWrites = vi.fn().mockResolvedValue({
      solutionMoves: { from: [[{ san: 'Nf3', note: null }]], to: [[{ san: 'Bg5', note: null }]] },
    });

    const { updatePositionEntry } = await import('./user-position-mutations');
    const result = await updatePositionEntry({ ...baseUpdateParams, applyExtraWrites });

    expect(result).toEqual({ success: true });
    expect(mockTxRevisionInsertValues).toHaveBeenCalledWith({
      positionId: TEST_POSITION_ID,
      editorId: TEST_USER_ID,
      changes: {
        fen: { from: 'old-fen', to: VALID_FEN },
        title: { from: 'Old title', to: 'Updated title' },
        description: { from: 'Old description', to: null },
        solutionMoves: {
          from: [[{ san: 'Nf3', note: null }]],
          to: [[{ san: 'Bg5', note: null }]],
        },
      },
    });
  });

  it('skips the activity log and the revision row when nothing changed (no-op edit)', async () => {
    mockSelectLimit.mockResolvedValue([
      { ...ownedRow, fen: VALID_FEN, title: 'Updated title', description: null },
    ]);

    const { updatePositionEntry } = await import('./user-position-mutations');
    const result = await updatePositionEntry(baseUpdateParams);

    expect(result).toEqual({ success: true });
    expect(mockLogActivityEvent).not.toHaveBeenCalled();
    expect(mockTxRevisionInsertValues).not.toHaveBeenCalled();
  });

  it('uses the puzzle activity verb for puzzle updates', async () => {
    mockSelectLimit.mockResolvedValue([{ ...ownedRow, type: 'puzzle' }]);

    const { updatePositionEntry } = await import('./user-position-mutations');
    await updatePositionEntry({ ...baseUpdateParams, kind: 'puzzle' });

    expect(mockLogActivityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'update_puzzle' })
    );
  });
});

const baseDeleteParams = {
  positionId: TEST_POSITION_ID,
  locale: 'ja',
  kind: 'memory' as const,
  rateLimit: RATE_LIMIT,
};

describe('deletePositionEntry', () => {
  beforeEach(() => {
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockSelectLimit.mockResolvedValue([ownedRow]);
  });

  it('propagates signInRequired from the guard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { deletePositionEntry } = await import('./user-position-mutations');
    const result = await deletePositionEntry(baseDeleteParams);

    expect(result).toEqual({ error: 'signInRequired' });
    expect(mockSelectLimit).not.toHaveBeenCalled();
  });

  it('returns notFound when the position does not exist or is of a different kind', async () => {
    const { deletePositionEntry } = await import('./user-position-mutations');

    mockSelectLimit.mockResolvedValue([]);
    expect(await deletePositionEntry(baseDeleteParams)).toEqual({ error: 'notFound' });

    mockSelectLimit.mockResolvedValue([{ ...ownedRow, type: 'puzzle' }]);
    expect(await deletePositionEntry(baseDeleteParams)).toEqual({ error: 'notFound' });

    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
  });

  it('returns unauthorized when the caller is not the owner', async () => {
    mockSelectLimit.mockResolvedValue([{ ...ownedRow, userId: OTHER_USER_ID }]);

    const { deletePositionEntry } = await import('./user-position-mutations');
    const result = await deletePositionEntry(baseDeleteParams);

    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
  });

  it('returns alreadyDeleted when the position is already soft-deleted', async () => {
    mockSelectLimit.mockResolvedValue([{ ...ownedRow, deletedAt: new Date('2025-01-01') }]);

    const { deletePositionEntry } = await import('./user-position-mutations');
    const result = await deletePositionEntry(baseDeleteParams);

    expect(result).toEqual({ error: 'alreadyDeleted' });
    expect(mockTxUpdateWhere).not.toHaveBeenCalled();
  });

  it('soft-deletes the row and claws back points, revalidating nothing', async () => {
    const { deletePositionEntry } = await import('./user-position-mutations');
    const result = await deletePositionEntry(baseDeleteParams);

    expect(result).toEqual({ success: true });
    expect(mockTxUpdateWhere).toHaveBeenCalledTimes(1);
    const updateCall = mockTxUpdateWhere.mock.calls[0][0] as { values: Record<string, unknown> };
    expect(updateCall.values.deletedAt).toBeInstanceOf(Date);
    expect(mockClawbackPointsForPost).toHaveBeenCalledWith(expect.anything(), TEST_USER_ID, {
      type: 'position_memory',
      id: TEST_POSITION_ID,
    });
    // Soft-delete leaves the row as the durable record — no activity log.
    expect(mockLogActivityEvent).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
