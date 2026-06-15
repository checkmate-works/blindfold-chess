import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthenticateAndGuard = vi.fn();
const mockSelectLimit = vi.fn();
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn();
const mockTxUpdate = vi.fn();
const mockCreateNotification = vi.fn();
const mockRevalidatePath = vi.fn();
const mockGetRequestById = vi.fn();
const mockGetViewerPending = vi.fn();
const mockGetLinkedChunkIds = vi.fn();
const mockIsUniqueViolation = vi.fn();
const mockValidateAndDedupeTagIds = vi.fn();
const mockApplyAcceptedProposal = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  authenticateAndGuard: (...args: unknown[]) => mockAuthenticateAndGuard(...args),
}));

vi.mock('@/lib/notifications/notification', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

vi.mock('@/lib/db/extract-pg-error-code', () => ({
  isUniqueViolation: (err: unknown) => mockIsUniqueViolation(err),
}));

vi.mock('@/lib/positions/tag-validation', () => ({
  validateAndDedupeTagIds: (...args: unknown[]) => mockValidateAndDedupeTagIds(...args),
}));

vi.mock('./queries', () => ({
  getPositionEditRequestById: (id: string) => mockGetRequestById(id),
  getViewerPendingEditRequestForPosition: (positionId: string, viewerId: string | null) =>
    mockGetViewerPending(positionId, viewerId),
  getLinkedChunkIdsForPosition: (positionId: string) => mockGetLinkedChunkIds(positionId),
}));

vi.mock('./apply-position-edit-proposal', () => ({
  applyAcceptedPositionProposal: (...args: unknown[]) => mockApplyAcceptedProposal(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  RATE_LIMITS: {
    submitPositionEditRequest: {
      action: 'submit_position_edit_request',
      maxAttempts: 10,
      windowMs: 1,
    },
    resolvePositionEditRequest: {
      action: 'resolve_position_edit_request',
      maxAttempts: 30,
      windowMs: 1,
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

const POSITION_EDIT_REQUESTS_TABLE = { __table: 'position_edit_requests' };
const POSITIONS_TABLE = { __table: 'positions' };

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
              if (table === POSITION_EDIT_REQUESTS_TABLE) {
                mockTxUpdate({ values, where: args });
              }
            },
          }),
        }),
        execute: vi.fn().mockResolvedValue(undefined),
      };
      return fn(tx);
    },
  },
  positionEditRequests: POSITION_EDIT_REQUESTS_TABLE,
  positions: POSITIONS_TABLE,
}));

const PROPOSER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const OTHER_USER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const POSITION_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const REQUEST_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const CHUNK_A = '11111111-1111-4111-8111-111111111111';
const CHUNK_B = '22222222-2222-4222-8222-222222222222';

function mockPosition(overrides: Partial<Record<string, unknown>> = {}) {
  mockSelectLimit.mockResolvedValue([
    { id: POSITION_ID, userId: OWNER_ID, type: 'memory', deletedAt: null, ...overrides },
  ]);
}

describe('submitPositionEditRequestEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: PROPOSER_ID } });
    mockInsertReturning.mockResolvedValue([{ id: REQUEST_ID }]);
    mockGetViewerPending.mockResolvedValue(null);
    mockGetLinkedChunkIds.mockResolvedValue([]); // empty current links
    mockIsUniqueViolation.mockReturnValue(false);
    mockValidateAndDedupeTagIds.mockResolvedValue({ ok: true, deduped: { chunkIds: [CHUNK_A] } });
  });

  it('propagates signInRequired from the guard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });
    const { submitPositionEditRequestEntry } = await import('./mutations');
    const result = await submitPositionEditRequestEntry({
      positionId: POSITION_ID,
      payload: { proposedChunkIds: [CHUNK_A] },
    });
    expect(result).toEqual({ error: 'signInRequired' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('returns notFound for a malformed positionId', async () => {
    const { submitPositionEditRequestEntry } = await import('./mutations');
    const result = await submitPositionEditRequestEntry({
      positionId: 'nope',
      payload: { proposedChunkIds: [CHUNK_A] },
    });
    expect(result).toEqual({ error: 'notFound' });
  });

  it('returns notFound when the position is soft-deleted', async () => {
    mockPosition({ deletedAt: new Date() });
    const { submitPositionEditRequestEntry } = await import('./mutations');
    const result = await submitPositionEditRequestEntry({
      positionId: POSITION_ID,
      payload: { proposedChunkIds: [CHUNK_A] },
    });
    expect(result).toEqual({ error: 'notFound' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('returns ownerCannotPropose when the proposer owns the position', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: OWNER_ID } });
    mockPosition();
    const { submitPositionEditRequestEntry } = await import('./mutations');
    const result = await submitPositionEditRequestEntry({
      positionId: POSITION_ID,
      payload: { proposedChunkIds: [CHUNK_A] },
    });
    expect(result).toEqual({ error: 'ownerCannotPropose' });
  });

  it('returns alreadyHasPending when the viewer already has a pending request', async () => {
    mockPosition();
    mockGetViewerPending.mockResolvedValue('existing-id');
    const { submitPositionEditRequestEntry } = await import('./mutations');
    const result = await submitPositionEditRequestEntry({
      positionId: POSITION_ID,
      payload: { proposedChunkIds: [CHUNK_A] },
    });
    expect(result).toEqual({ error: 'alreadyHasPending' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('returns identicalChunkSet when the proposed set equals the current links', async () => {
    mockPosition();
    mockGetLinkedChunkIds.mockResolvedValue([CHUNK_A]);
    const { submitPositionEditRequestEntry } = await import('./mutations');
    const result = await submitPositionEditRequestEntry({
      positionId: POSITION_ID,
      payload: { proposedChunkIds: [CHUNK_A] },
    });
    expect(result).toEqual({ error: 'identicalChunkSet' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('returns invalidChunk when a proposed chunk is not published / available', async () => {
    mockPosition();
    mockValidateAndDedupeTagIds.mockResolvedValue({ ok: false, error: 'invalidChunk' });
    const { submitPositionEditRequestEntry } = await import('./mutations');
    const result = await submitPositionEditRequestEntry({
      positionId: POSITION_ID,
      payload: { proposedChunkIds: [CHUNK_A] },
    });
    expect(result).toEqual({ error: 'invalidChunk' });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('translates a 23505 unique violation on INSERT to alreadyHasPending', async () => {
    mockPosition();
    mockInsertReturning.mockRejectedValueOnce(new Error('duplicate key value'));
    mockIsUniqueViolation.mockReturnValue(true);
    const { submitPositionEditRequestEntry } = await import('./mutations');
    const result = await submitPositionEditRequestEntry({
      positionId: POSITION_ID,
      payload: { proposedChunkIds: [CHUNK_A] },
    });
    expect(result).toEqual({ error: 'alreadyHasPending' });
  });

  it('inserts the proposed set and notifies the owner with positionType metadata', async () => {
    mockPosition();
    const { submitPositionEditRequestEntry } = await import('./mutations');
    const result = await submitPositionEditRequestEntry({
      positionId: POSITION_ID,
      payload: { proposedChunkIds: [CHUNK_A], comment: 'add the battery' },
    });
    expect(result).toEqual({ success: true, id: REQUEST_ID });
    expect(mockInsertValues).toHaveBeenCalledWith({
      positionId: POSITION_ID,
      proposerId: PROPOSER_ID,
      proposedChunkIds: [CHUNK_A],
      comment: 'add the battery',
    });
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: OWNER_ID,
        actorId: PROPOSER_ID,
        type: 'position_edit_request_submitted',
        metadata: { positionId: POSITION_ID, positionType: 'memory' },
      })
    );
  });
});

describe('acceptPositionEditRequestEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: OWNER_ID } });
  });

  it('rejects when the caller is not the position owner', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: OTHER_USER_ID } });
    mockGetRequestById.mockResolvedValue({
      id: REQUEST_ID,
      positionId: POSITION_ID,
      proposerId: PROPOSER_ID,
      proposedChunkIds: [CHUNK_A],
      status: 'pending',
    });
    mockPosition();
    const { acceptPositionEditRequestEntry } = await import('./mutations');
    const result = await acceptPositionEditRequestEntry(REQUEST_ID);
    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockTxUpdate).not.toHaveBeenCalled();
    expect(mockApplyAcceptedProposal).not.toHaveBeenCalled();
  });

  it('rejects when the request is already resolved', async () => {
    mockGetRequestById.mockResolvedValue({
      id: REQUEST_ID,
      positionId: POSITION_ID,
      proposerId: PROPOSER_ID,
      proposedChunkIds: [CHUNK_A],
      status: 'accepted',
    });
    const { acceptPositionEditRequestEntry } = await import('./mutations');
    const result = await acceptPositionEditRequestEntry(REQUEST_ID);
    expect(result).toEqual({ error: 'alreadyResolved' });
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('marks accepted, applies the proposed set, and notifies the proposer', async () => {
    mockGetRequestById.mockResolvedValue({
      id: REQUEST_ID,
      positionId: POSITION_ID,
      proposerId: PROPOSER_ID,
      proposedChunkIds: [CHUNK_A, CHUNK_B],
      status: 'pending',
    });
    mockPosition();
    const { acceptPositionEditRequestEntry } = await import('./mutations');
    const result = await acceptPositionEditRequestEntry(REQUEST_ID);
    expect(result).toEqual({ success: true });
    expect(mockTxUpdate).toHaveBeenCalledTimes(1);
    const reqUpdate = mockTxUpdate.mock.calls[0][0] as { values: Record<string, unknown> };
    expect(reqUpdate.values).toMatchObject({ status: 'accepted', resolverId: OWNER_ID });
    expect(mockApplyAcceptedProposal).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: PROPOSER_ID,
        actorId: OWNER_ID,
        type: 'position_edit_request_accepted',
        metadata: { positionId: POSITION_ID, positionType: 'memory' },
      })
    );
  });
});

describe('rejectPositionEditRequestEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: OWNER_ID } });
  });

  it('marks rejected without applying the proposal or notifying', async () => {
    mockGetRequestById.mockResolvedValue({
      id: REQUEST_ID,
      positionId: POSITION_ID,
      proposerId: PROPOSER_ID,
      proposedChunkIds: [CHUNK_A],
      status: 'pending',
    });
    mockPosition();
    const { rejectPositionEditRequestEntry } = await import('./mutations');
    const result = await rejectPositionEditRequestEntry(REQUEST_ID);
    expect(result).toEqual({ success: true });
    const reqUpdate = mockTxUpdate.mock.calls[0][0] as { values: Record<string, unknown> };
    expect(reqUpdate.values).toMatchObject({ status: 'rejected' });
    expect(mockApplyAcceptedProposal).not.toHaveBeenCalled();
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});

describe('withdrawPositionEditRequestEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: PROPOSER_ID } });
  });

  it('rejects when the caller is not the proposer', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: OTHER_USER_ID } });
    mockGetRequestById.mockResolvedValue({
      id: REQUEST_ID,
      positionId: POSITION_ID,
      proposerId: PROPOSER_ID,
      proposedChunkIds: [CHUNK_A],
      status: 'pending',
    });
    mockPosition();
    const { withdrawPositionEditRequestEntry } = await import('./mutations');
    const result = await withdrawPositionEditRequestEntry(REQUEST_ID);
    expect(result).toEqual({ error: 'unauthorized' });
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('marks withdrawn for the proposer without notifying the owner', async () => {
    mockGetRequestById.mockResolvedValue({
      id: REQUEST_ID,
      positionId: POSITION_ID,
      proposerId: PROPOSER_ID,
      proposedChunkIds: [CHUNK_A],
      status: 'pending',
    });
    mockPosition();
    const { withdrawPositionEditRequestEntry } = await import('./mutations');
    const result = await withdrawPositionEditRequestEntry(REQUEST_ID);
    expect(result).toEqual({ success: true });
    const reqUpdate = mockTxUpdate.mock.calls[0][0] as { values: Record<string, unknown> };
    expect(reqUpdate.values).toMatchObject({ status: 'withdrawn', resolverId: PROPOSER_ID });
    expect(mockApplyAcceptedProposal).not.toHaveBeenCalled();
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});
