import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthenticateAndGuard = vi.fn();
const mockGetLineForViewer = vi.fn();
const mockGetForDelete = vi.fn();
const mockDelete = vi.fn();
const mockIsLinkable = vi.fn();
const mockInsert = vi.fn();
const mockNotifyOwner = vi.fn();

vi.mock('@/lib/notifications/repertoire-chunk-link-notification', () => ({
  notifyRepertoireOwnerOfChunkLink: (...args: unknown[]) => mockNotifyOwner(...args),
}));

vi.mock('@/lib/auth', () => ({
  authenticateGuardAndRequireProfile: (...args: unknown[]) => mockAuthenticateAndGuard(...args),
}));

vi.mock('@/lib/repertoires/queries', () => ({
  getRepertoireLineForViewer: (...args: unknown[]) => mockGetLineForViewer(...args),
}));

vi.mock('@/lib/db/repertoire-chunks', () => ({
  getRepertoireChunkForDelete: (...args: unknown[]) => mockGetForDelete(...args),
  deleteRepertoireChunk: (...args: unknown[]) => mockDelete(...args),
  insertRepertoireChunk: (...args: unknown[]) => mockInsert(...args),
  isLinkableChunkForViewer: (...args: unknown[]) => mockIsLinkable(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  RATE_LIMITS: {
    linkRepertoireChunk: { action: 'link_repertoire_chunk', maxAttempts: 30, windowMs: 3_600_000 },
  },
}));

vi.mock('@/lib/server-action-error', () => ({
  handleServerActionError: () => ({ success: false, error: 'unexpected_error' }),
}));

const LINK_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const CALLER = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SUGGESTER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const OWNER = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const REPERTOIRE_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const CHUNK_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

// e4 e5 Nf3 — three plies, so positions[0..3] exist (index 0 is the start).
const LINE = { id: 'line-1', pgn: '1. e4 e5 2. Nf3', startingFen: null };

function mockLineForViewer() {
  mockGetLineForViewer.mockResolvedValue({
    repertoire: { id: REPERTOIRE_ID },
    line: LINE,
    lines: [LINE],
    profile: null,
    isOwner: false,
  });
}

describe('addRepertoireChunkAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: CALLER } });
    mockLineForViewer();
    mockIsLinkable.mockResolvedValue(true);
    mockInsert.mockResolvedValue({ id: LINK_ID, createdAt: new Date('2026-07-30T00:00:00Z') });
  });

  it('derives position_key server-side from the replayed line, never from client input', async () => {
    const { addRepertoireChunkAction } = await import('./repertoire-chunks');
    const result = await addRepertoireChunkAction({
      repertoireId: REPERTOIRE_ID,
      lineNo: 1,
      ply: 2,
      chunkId: CHUNK_ID,
    });

    expect(result).toEqual({
      success: true,
      id: LINK_ID,
      createdAt: '2026-07-30T00:00:00.000Z',
    });
    // ply 2 is the position after 1. e4 e5 — the FEN's first four fields.
    expect(mockInsert).toHaveBeenCalledWith({
      repertoireId: REPERTOIRE_ID,
      positionKey: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -',
      chunkId: CHUNK_ID,
      suggestedById: CALLER,
    });
  });

  it('scopes the linkability check to the calling user', async () => {
    const { addRepertoireChunkAction } = await import('./repertoire-chunks');
    await addRepertoireChunkAction({
      repertoireId: REPERTOIRE_ID,
      lineNo: 1,
      ply: 1,
      chunkId: CHUNK_ID,
    });

    expect(mockIsLinkable).toHaveBeenCalledWith(CHUNK_ID, CALLER);
  });

  it('rejects ply beyond the line length without inserting', async () => {
    const { addRepertoireChunkAction } = await import('./repertoire-chunks');
    const result = await addRepertoireChunkAction({
      repertoireId: REPERTOIRE_ID,
      lineNo: 1,
      ply: 4, // the line has only 3 plies
      chunkId: CHUNK_ID,
    });

    expect(result).toEqual({ success: false, error: 'invalid_input' });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5])(
    'rejects a non-positive-integer ply (%s) without inserting',
    async (ply) => {
      const { addRepertoireChunkAction } = await import('./repertoire-chunks');
      const result = await addRepertoireChunkAction({
        repertoireId: REPERTOIRE_ID,
        lineNo: 1,
        ply,
        chunkId: CHUNK_ID,
      });

      expect(result).toEqual({ success: false, error: 'invalid_input' });
      expect(mockGetLineForViewer).not.toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
    }
  );

  it('returns not_found for a line the viewer may not see (or that does not exist)', async () => {
    mockGetLineForViewer.mockResolvedValue(null);

    const { addRepertoireChunkAction } = await import('./repertoire-chunks');
    const result = await addRepertoireChunkAction({
      repertoireId: REPERTOIRE_ID,
      lineNo: 1,
      ply: 1,
      chunkId: CHUNK_ID,
    });

    expect(result).toEqual({ success: false, error: 'not_found' });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('notifies the repertoire owner of a link that landed', async () => {
    const { addRepertoireChunkAction } = await import('./repertoire-chunks');
    await addRepertoireChunkAction({
      repertoireId: REPERTOIRE_ID,
      lineNo: 1,
      ply: 1,
      chunkId: CHUNK_ID,
    });

    expect(mockNotifyOwner).toHaveBeenCalledWith({
      actorId: CALLER,
      repertoireId: REPERTOIRE_ID,
      lineNo: 1,
      ply: 1,
      chunkId: CHUNK_ID,
      positionKey: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -',
    });
  });

  it('rejects a chunk the caller may not link, without inserting', async () => {
    mockIsLinkable.mockResolvedValue(false);

    const { addRepertoireChunkAction } = await import('./repertoire-chunks');
    const result = await addRepertoireChunkAction({
      repertoireId: REPERTOIRE_ID,
      lineNo: 1,
      ply: 1,
      chunkId: CHUNK_ID,
    });

    expect(result).toEqual({ success: false, error: 'chunk_not_available' });
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockNotifyOwner).not.toHaveBeenCalled();
  });

  it('surfaces a duplicate link as already_linked rather than an error, without notifying', async () => {
    mockInsert.mockResolvedValue(null);

    const { addRepertoireChunkAction } = await import('./repertoire-chunks');
    const result = await addRepertoireChunkAction({
      repertoireId: REPERTOIRE_ID,
      lineNo: 1,
      ply: 1,
      chunkId: CHUNK_ID,
    });

    expect(result).toEqual({ success: false, error: 'already_linked' });
    expect(mockNotifyOwner).not.toHaveBeenCalled();
  });

  it('never reaches the line lookup when auth fails', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { addRepertoireChunkAction } = await import('./repertoire-chunks');
    const result = await addRepertoireChunkAction({
      repertoireId: REPERTOIRE_ID,
      lineNo: 1,
      ply: 1,
      chunkId: CHUNK_ID,
    });

    expect(result).toEqual({ success: false, error: 'signInRequired' });
    expect(mockGetLineForViewer).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe('deleteRepertoireChunkAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: CALLER } });
    mockDelete.mockResolvedValue(undefined);
  });

  it('forbids an unrelated user (neither suggester nor repertoire owner)', async () => {
    mockGetForDelete.mockResolvedValue({ suggestedById: SUGGESTER, repertoireOwnerId: OWNER });

    const { deleteRepertoireChunkAction } = await import('./repertoire-chunks');
    const result = await deleteRepertoireChunkAction(LINK_ID);

    expect(result).toEqual({ success: false, error: 'forbidden' });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('allows the user who added the link', async () => {
    mockGetForDelete.mockResolvedValue({ suggestedById: CALLER, repertoireOwnerId: OWNER });

    const { deleteRepertoireChunkAction } = await import('./repertoire-chunks');
    const result = await deleteRepertoireChunkAction(LINK_ID);

    expect(result).toEqual({ success: true });
    expect(mockDelete).toHaveBeenCalledWith(LINK_ID);
  });

  it("allows the repertoire's registered owner (even for someone else's link)", async () => {
    mockGetForDelete.mockResolvedValue({ suggestedById: SUGGESTER, repertoireOwnerId: CALLER });

    const { deleteRepertoireChunkAction } = await import('./repertoire-chunks');
    const result = await deleteRepertoireChunkAction(LINK_ID);

    expect(result).toEqual({ success: true });
    expect(mockDelete).toHaveBeenCalledWith(LINK_ID);
  });

  it('does not treat an account-less repertoire (null owner) as ownable by the caller', async () => {
    mockGetForDelete.mockResolvedValue({ suggestedById: SUGGESTER, repertoireOwnerId: null });

    const { deleteRepertoireChunkAction } = await import('./repertoire-chunks');
    const result = await deleteRepertoireChunkAction(LINK_ID);

    expect(result).toEqual({ success: false, error: 'forbidden' });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('returns not_found when the link is missing', async () => {
    mockGetForDelete.mockResolvedValue(undefined);

    const { deleteRepertoireChunkAction } = await import('./repertoire-chunks');
    const result = await deleteRepertoireChunkAction(LINK_ID);

    expect(result).toEqual({ success: false, error: 'not_found' });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('returns the guard error and never looks up the link when auth fails', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { deleteRepertoireChunkAction } = await import('./repertoire-chunks');
    const result = await deleteRepertoireChunkAction(LINK_ID);

    expect(result).toEqual({ success: false, error: 'signInRequired' });
    expect(mockGetForDelete).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
