import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthenticateAndGuard = vi.fn();
const mockSelectLimit = vi.fn();
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn();
const mockTxUpdateChunkEditRequests = vi.fn();
const mockTxUpdateChunks = vi.fn();
const mockLogActivityEvent = vi.fn();
const mockCreateNotification = vi.fn();
const mockRevalidatePath = vi.fn();
const mockGetEditRequestById = vi.fn();
const mockGetViewerPendingEditRequestForChunk = vi.fn();
const mockIsUniqueViolation = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  authenticateAndGuard: (...args: unknown[]) => mockAuthenticateAndGuard(...args),
}));

vi.mock('@/lib/users/activity-log', () => ({
  logActivityEvent: (...args: unknown[]) => mockLogActivityEvent(...args),
}));

vi.mock('@/lib/notifications/notification', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

vi.mock('@/lib/db/extract-pg-error-code', () => ({
  isUniqueViolation: (err: unknown) => mockIsUniqueViolation(err),
}));

vi.mock('./queries', () => ({
  getEditRequestById: (id: string) => mockGetEditRequestById(id),
  getViewerPendingEditRequestForChunk: (chunkId: string, viewerId: string | null) =>
    mockGetViewerPendingEditRequestForChunk(chunkId, viewerId),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  RATE_LIMITS: {
    submitChunkEditRequest: {
      action: 'submit_chunk_edit_request',
      maxAttempts: 10,
      windowMs: 3_600_000,
    },
    resolveChunkEditRequest: {
      action: 'resolve_chunk_edit_request',
      maxAttempts: 30,
      windowMs: 3_600_000,
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

// Distinguish UPDATE writes to `chunk_edit_requests` vs `chunks` inside
// the transaction by tagging the table identifier in the mock.
const CHUNK_EDIT_REQUESTS_TABLE = { __table: 'chunk_edit_requests' };
const CHUNKS_TABLE = { __table: 'chunks' };

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mockSelectLimit(),
        }),
      }),
    }),
    insert: () => ({
      values: (values: unknown) => {
        mockInsertValues(values);
        return { returning: () => mockInsertReturning() };
      },
    }),
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        update: (table: unknown) => ({
          set: (values: unknown) => ({
            where: (...args: unknown[]) => {
              if (table === CHUNK_EDIT_REQUESTS_TABLE) {
                mockTxUpdateChunkEditRequests({ values, where: args });
              } else if (table === CHUNKS_TABLE) {
                mockTxUpdateChunks({ values, where: args });
              }
            },
          }),
        }),
        // `resolveEditRequest` opens the transaction with a
        // `SELECT ... FOR UPDATE` to serialize concurrent accepts on
        // the same chunk. The mock returns immediately — the assertion
        // is that the call happens, not what it locks.
        execute: vi.fn().mockResolvedValue(undefined),
      };
      return fn(tx);
    },
  },
  chunkEditRequests: CHUNK_EDIT_REQUESTS_TABLE,
  chunks: CHUNKS_TABLE,
}));

const PROPOSER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OWNER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const OTHER_USER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const CHUNK_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const REQUEST_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const SLUG = 'rook-battery';

function mockDraftChunk(overrides: Partial<Record<string, unknown>> = {}) {
  mockSelectLimit.mockResolvedValue([
    {
      id: CHUNK_ID,
      userId: OWNER_ID,
      slug: SLUG,
      title: 'Rook Battery',
      description: 'Doubled rooks on a file',
      status: 'draft',
      deletedAt: null,
      ...overrides,
    },
  ]);
}

describe('submitEditRequestEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: PROPOSER_ID } });
    mockInsertReturning.mockResolvedValue([{ id: REQUEST_ID }]);
    // Default: viewer has no pending suggestion. Tests covering the
    // one-pending guard override this per-case.
    mockGetViewerPendingEditRequestForChunk.mockResolvedValue(null);
    mockIsUniqueViolation.mockReturnValue(false);
  });

  it('propagates signInRequired from the guard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { submitEditRequestEntry } = await import('./mutations');
    const result = await submitEditRequestEntry({
      chunkId: CHUNK_ID,
      payload: { proposedTitle: 'Kingside fianchetto' },
    });

    expect(result).toEqual({ error: 'signInRequired' });
    expect(mockSelectLimit).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('returns notFound when the chunkId is empty', async () => {
    const { submitEditRequestEntry } = await import('./mutations');
    const result = await submitEditRequestEntry({
      chunkId: '',
      payload: { proposedTitle: 'X' },
    });

    expect(result).toEqual({ error: 'notFound' });
  });

  it('returns notFound when the chunk does not exist', async () => {
    mockSelectLimit.mockResolvedValue([]);

    const { submitEditRequestEntry } = await import('./mutations');
    const result = await submitEditRequestEntry({
      chunkId: CHUNK_ID,
      payload: { proposedTitle: 'X' },
    });

    expect(result).toEqual({ error: 'notFound' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('returns ownerCannotPropose when the proposer is the chunk owner', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: OWNER_ID } });
    mockDraftChunk();

    const { submitEditRequestEntry } = await import('./mutations');
    const result = await submitEditRequestEntry({
      chunkId: CHUNK_ID,
      payload: { proposedTitle: 'Kingside fianchetto' },
    });

    expect(result).toEqual({ error: 'ownerCannotPropose' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('returns chunkNotDraft when the chunk is published', async () => {
    mockDraftChunk({ status: 'published' });

    const { submitEditRequestEntry } = await import('./mutations');
    const result = await submitEditRequestEntry({
      chunkId: CHUNK_ID,
      payload: { proposedTitle: 'Kingside fianchetto' },
    });

    expect(result).toEqual({ error: 'chunkNotDraft' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('returns alreadyHasPending when the proposer already has a pending suggestion', async () => {
    // One pending per (chunk, proposer) is enforced at the application
    // layer — the visitor is expected to withdraw + resubmit rather than
    // stack additional pending rows. The dedicated edit-requests page
    // hides the form in this state.
    mockDraftChunk();
    mockGetViewerPendingEditRequestForChunk.mockResolvedValue('existing-pending-req-id');

    const { submitEditRequestEntry } = await import('./mutations');
    const result = await submitEditRequestEntry({
      chunkId: CHUNK_ID,
      payload: { proposedTitle: 'Kingside fianchetto' },
    });

    expect(result).toEqual({ error: 'alreadyHasPending' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('translates a 23505 unique violation on INSERT to alreadyHasPending', async () => {
    // Race-window backstop: two tabs pass the
    // `getViewerPendingEditRequestForChunk` check simultaneously
    // and both try to INSERT. The partial unique index
    // `uq_chunk_edit_requests_one_pending` rejects the second with
    // 23505, and the mutation translates that to the same error
    // code the app-layer guard returns.
    mockDraftChunk();
    mockInsertReturning.mockRejectedValueOnce(new Error('duplicate key value'));
    mockIsUniqueViolation.mockReturnValue(true);

    const { submitEditRequestEntry } = await import('./mutations');
    const result = await submitEditRequestEntry({
      chunkId: CHUNK_ID,
      payload: { proposedTitle: 'Kingside fianchetto' },
    });

    expect(result).toEqual({ error: 'alreadyHasPending' });
  });

  it('returns a validation error when neither field changed', async () => {
    mockDraftChunk();

    const { submitEditRequestEntry } = await import('./mutations');
    const result = await submitEditRequestEntry({
      chunkId: CHUNK_ID,
      payload: { proposedTitle: 'Rook Battery' }, // identical to current
    });

    expect(result).toMatchObject({ error: expect.stringMatching(/identical/i) });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('inserts the request with only the changed fields populated', async () => {
    mockDraftChunk();

    const { submitEditRequestEntry } = await import('./mutations');
    const result = await submitEditRequestEntry({
      chunkId: CHUNK_ID,
      payload: { proposedTitle: 'Kingside fianchetto', comment: 'cleaner name' },
    });

    expect(result).toEqual({ success: true, id: REQUEST_ID });
    expect(mockInsertValues).toHaveBeenCalledWith({
      chunkId: CHUNK_ID,
      proposerId: PROPOSER_ID,
      proposedTitle: 'Kingside fianchetto',
      proposedDescription: null,
      comment: 'cleaner name',
    });
  });

  it('notifies the chunk owner without writing an activity-log row', async () => {
    mockDraftChunk();

    const { submitEditRequestEntry } = await import('./mutations');
    await submitEditRequestEntry({
      chunkId: CHUNK_ID,
      payload: { proposedTitle: 'Kingside fianchetto' },
    });

    // The chunk_edit_requests row is itself the durable record of the
    // submission, so it is not duplicated into the activity log.
    expect(mockLogActivityEvent).not.toHaveBeenCalled();
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: OWNER_ID,
        actorId: PROPOSER_ID,
        type: 'chunk_edit_request_submitted',
      })
    );
  });

  it('skips owner notification when the chunk is orphaned (userId null)', async () => {
    mockDraftChunk({ userId: null });

    const { submitEditRequestEntry } = await import('./mutations');
    await submitEditRequestEntry({
      chunkId: CHUNK_ID,
      payload: { proposedTitle: 'X' },
    });

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});

describe('acceptEditRequestEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: OWNER_ID } });
  });

  it('rejects when the caller is not the chunk owner', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: OTHER_USER_ID } });
    mockGetEditRequestById.mockResolvedValue({
      id: REQUEST_ID,
      chunkId: CHUNK_ID,
      proposerId: PROPOSER_ID,
      proposedTitle: 'X',
      proposedDescription: null,
      status: 'pending',
    });
    mockDraftChunk();

    const { acceptEditRequestEntry } = await import('./mutations');
    const result = await acceptEditRequestEntry(REQUEST_ID);

    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockTxUpdateChunkEditRequests).not.toHaveBeenCalled();
    expect(mockTxUpdateChunks).not.toHaveBeenCalled();
  });

  it('rejects when the request is already resolved', async () => {
    mockGetEditRequestById.mockResolvedValue({
      id: REQUEST_ID,
      chunkId: CHUNK_ID,
      proposerId: PROPOSER_ID,
      proposedTitle: 'X',
      status: 'accepted',
    });

    const { acceptEditRequestEntry } = await import('./mutations');
    const result = await acceptEditRequestEntry(REQUEST_ID);

    expect(result).toEqual({ error: 'alreadyResolved' });
    expect(mockTxUpdateChunkEditRequests).not.toHaveBeenCalled();
  });

  it('rejects when the chunk is no longer a draft', async () => {
    mockGetEditRequestById.mockResolvedValue({
      id: REQUEST_ID,
      chunkId: CHUNK_ID,
      proposerId: PROPOSER_ID,
      proposedTitle: 'X',
      status: 'pending',
    });
    mockDraftChunk({ status: 'published' });

    const { acceptEditRequestEntry } = await import('./mutations');
    const result = await acceptEditRequestEntry(REQUEST_ID);

    expect(result).toEqual({ error: 'chunkNotDraft' });
    expect(mockTxUpdateChunkEditRequests).not.toHaveBeenCalled();
  });

  it('marks the request accepted AND applies the proposed title to the chunk', async () => {
    mockGetEditRequestById.mockResolvedValue({
      id: REQUEST_ID,
      chunkId: CHUNK_ID,
      proposerId: PROPOSER_ID,
      proposedTitle: 'Kingside fianchetto',
      proposedDescription: null,
      status: 'pending',
    });
    mockDraftChunk();

    const { acceptEditRequestEntry } = await import('./mutations');
    const result = await acceptEditRequestEntry(REQUEST_ID);

    expect(result).toEqual({ success: true });
    expect(mockTxUpdateChunkEditRequests).toHaveBeenCalledTimes(1);
    const reqUpdate = mockTxUpdateChunkEditRequests.mock.calls[0][0] as {
      values: Record<string, unknown>;
    };
    expect(reqUpdate.values).toMatchObject({
      status: 'accepted',
      resolverId: OWNER_ID,
    });
    expect(mockTxUpdateChunks).toHaveBeenCalledTimes(1);
    const chunkUpdate = mockTxUpdateChunks.mock.calls[0][0] as {
      values: Record<string, unknown>;
    };
    expect(chunkUpdate.values).toEqual({ title: 'Kingside fianchetto' });
  });

  it('only updates the request row when the proposal had no chunk-side fields (e.g. legacy row)', async () => {
    mockGetEditRequestById.mockResolvedValue({
      id: REQUEST_ID,
      chunkId: CHUNK_ID,
      proposerId: PROPOSER_ID,
      proposedTitle: null,
      proposedDescription: null,
      status: 'pending',
    });
    mockDraftChunk();

    const { acceptEditRequestEntry } = await import('./mutations');
    await acceptEditRequestEntry(REQUEST_ID);

    expect(mockTxUpdateChunkEditRequests).toHaveBeenCalledTimes(1);
    expect(mockTxUpdateChunks).not.toHaveBeenCalled();
  });

  it('notifies the proposer on accept (different from the actor)', async () => {
    mockGetEditRequestById.mockResolvedValue({
      id: REQUEST_ID,
      chunkId: CHUNK_ID,
      proposerId: PROPOSER_ID,
      proposedTitle: 'X',
      proposedDescription: null,
      status: 'pending',
    });
    mockDraftChunk();

    const { acceptEditRequestEntry } = await import('./mutations');
    await acceptEditRequestEntry(REQUEST_ID);

    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: PROPOSER_ID,
        actorId: OWNER_ID,
        type: 'chunk_edit_request_accepted',
      })
    );
  });
});

describe('rejectEditRequestEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: OWNER_ID } });
  });

  it('marks the request rejected, leaving the chunk untouched', async () => {
    mockGetEditRequestById.mockResolvedValue({
      id: REQUEST_ID,
      chunkId: CHUNK_ID,
      proposerId: PROPOSER_ID,
      proposedTitle: 'X',
      proposedDescription: null,
      status: 'pending',
    });
    mockDraftChunk();

    const { rejectEditRequestEntry } = await import('./mutations');
    const result = await rejectEditRequestEntry(REQUEST_ID);

    expect(result).toEqual({ success: true });
    expect(mockTxUpdateChunkEditRequests).toHaveBeenCalledTimes(1);
    const reqUpdate = mockTxUpdateChunkEditRequests.mock.calls[0][0] as {
      values: Record<string, unknown>;
    };
    expect(reqUpdate.values).toMatchObject({
      status: 'rejected',
    });
    expect(mockTxUpdateChunks).not.toHaveBeenCalled();
  });

  it('does not notify the proposer on reject (intentionally silent)', async () => {
    // Explicit reject is silent for the same reason implicit reject
    // (someone else's suggestion was accepted first) is silent —
    // notifying only the explicitly-rejected proposers would create
    // an asymmetric experience that depends on owner-internal
    // scheduling rather than the proposer's action.
    mockGetEditRequestById.mockResolvedValue({
      id: REQUEST_ID,
      chunkId: CHUNK_ID,
      proposerId: PROPOSER_ID,
      status: 'pending',
    });
    mockDraftChunk();

    const { rejectEditRequestEntry } = await import('./mutations');
    await rejectEditRequestEntry(REQUEST_ID);

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});

describe('withdrawEditRequestEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: PROPOSER_ID } });
  });

  it('rejects when the caller is not the proposer', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: OTHER_USER_ID } });
    mockGetEditRequestById.mockResolvedValue({
      id: REQUEST_ID,
      chunkId: CHUNK_ID,
      proposerId: PROPOSER_ID,
      status: 'pending',
    });
    mockDraftChunk();

    const { withdrawEditRequestEntry } = await import('./mutations');
    const result = await withdrawEditRequestEntry(REQUEST_ID);

    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockTxUpdateChunkEditRequests).not.toHaveBeenCalled();
  });

  it('succeeds for the proposer even when the chunk has since been published', async () => {
    mockGetEditRequestById.mockResolvedValue({
      id: REQUEST_ID,
      chunkId: CHUNK_ID,
      proposerId: PROPOSER_ID,
      status: 'pending',
    });
    mockDraftChunk({ status: 'published' }); // withdraw stays legal regardless

    const { withdrawEditRequestEntry } = await import('./mutations');
    const result = await withdrawEditRequestEntry(REQUEST_ID);

    expect(result).toEqual({ success: true });
    expect(mockTxUpdateChunkEditRequests).toHaveBeenCalledTimes(1);
    const reqUpdate = mockTxUpdateChunkEditRequests.mock.calls[0][0] as {
      values: Record<string, unknown>;
    };
    expect(reqUpdate.values).toMatchObject({ status: 'withdrawn', resolverId: PROPOSER_ID });
    expect(mockTxUpdateChunks).not.toHaveBeenCalled();
  });

  it('does not notify the chunk owner on withdraw (intentionally silent)', async () => {
    // Withdraw is a quiet operation: the owner has nothing to act on
    // once the suggestion is gone, so a trailing notification would
    // chase a dead target. The pending-count badge on the chunk page
    // already reflects the reduction on the next visit.
    mockGetEditRequestById.mockResolvedValue({
      id: REQUEST_ID,
      chunkId: CHUNK_ID,
      proposerId: PROPOSER_ID,
      status: 'pending',
    });
    mockDraftChunk();

    const { withdrawEditRequestEntry } = await import('./mutations');
    await withdrawEditRequestEntry(REQUEST_ID);

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});
