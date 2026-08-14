import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthenticateAndGuard = vi.fn();
const mockGetForDelete = vi.fn();
const mockDelete = vi.fn();
const mockIsLinkable = vi.fn();
const mockInsert = vi.fn();
const mockNotifyGameOwner = vi.fn();

vi.mock('@/lib/notifications/game-chunk-link-notification', () => ({
  notifyGameOwnerOfChunkLink: (...args: unknown[]) => mockNotifyGameOwner(...args),
}));

vi.mock('@/lib/auth', () => ({
  authenticateGuardAndRequireProfile: (...args: unknown[]) => mockAuthenticateAndGuard(...args),
}));

vi.mock('@/lib/db/game-chunks', () => ({
  getGameChunkForDelete: (...args: unknown[]) => mockGetForDelete(...args),
  deleteGameChunk: (...args: unknown[]) => mockDelete(...args),
  insertGameChunk: (...args: unknown[]) => mockInsert(...args),
  isLinkableChunkForViewer: (...args: unknown[]) => mockIsLinkable(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  RATE_LIMITS: {
    linkGameChunk: { action: 'link_game_chunk', maxAttempts: 30, windowMs: 3_600_000 },
  },
}));

vi.mock('@/lib/server-action-error', () => ({
  handleServerActionError: () => ({ success: false, error: 'unexpected_error' }),
}));

const LINK_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const CALLER = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SUGGESTER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const OWNER = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const GAME_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const CHUNK_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

describe('addGameChunkAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: CALLER } });
    mockIsLinkable.mockResolvedValue(true);
    mockInsert.mockResolvedValue({ id: LINK_ID, createdAt: new Date('2026-07-30T00:00:00Z') });
  });

  // The eligibility rule is "published, or a draft the caller owns", so the
  // check cannot be answered without knowing who is asking — passing the
  // caller through is what makes the own-draft carve-out possible at all.
  it('scopes the linkability check to the calling user', async () => {
    const { addGameChunkAction } = await import('./game-chunks');
    const result = await addGameChunkAction({ gameId: GAME_ID, ply: 3, chunkId: CHUNK_ID });

    expect(mockIsLinkable).toHaveBeenCalledWith(CHUNK_ID, CALLER);
    expect(result).toEqual({
      success: true,
      id: LINK_ID,
      createdAt: '2026-07-30T00:00:00.000Z',
    });
    expect(mockInsert).toHaveBeenCalledWith({
      gameId: GAME_ID,
      ply: 3,
      chunkId: CHUNK_ID,
      suggestedById: CALLER,
    });
  });

  // The owner never asked for the link (no game-owner veto on `game_chunks`),
  // so the notification is the only thing that tells them it happened. The
  // action does not resolve the owner itself — that lookup, the self-link
  // guard and the anonymous-game case all live in `notifyGameOwnerOfChunkLink`.
  it("notifies the game's owner of a link that landed", async () => {
    const { addGameChunkAction } = await import('./game-chunks');
    await addGameChunkAction({ gameId: GAME_ID, ply: 3, chunkId: CHUNK_ID });

    expect(mockNotifyGameOwner).toHaveBeenCalledWith({
      actorId: CALLER,
      gameId: GAME_ID,
      ply: 3,
      chunkId: CHUNK_ID,
    });
  });

  it('rejects a chunk the caller may not link, without inserting', async () => {
    mockIsLinkable.mockResolvedValue(false);

    const { addGameChunkAction } = await import('./game-chunks');
    const result = await addGameChunkAction({ gameId: GAME_ID, ply: 3, chunkId: CHUNK_ID });

    expect(result).toEqual({ success: false, error: 'chunk_not_available' });
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockNotifyGameOwner).not.toHaveBeenCalled();
  });

  it('surfaces a duplicate link as already_linked rather than an error', async () => {
    mockInsert.mockResolvedValue(null);

    const { addGameChunkAction } = await import('./game-chunks');
    const result = await addGameChunkAction({ gameId: GAME_ID, ply: 3, chunkId: CHUNK_ID });

    expect(result).toEqual({ success: false, error: 'already_linked' });
    // Re-submitting an existing pair must not re-ping the owner.
    expect(mockNotifyGameOwner).not.toHaveBeenCalled();
  });

  it('never reaches the linkability check when auth fails', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { addGameChunkAction } = await import('./game-chunks');
    const result = await addGameChunkAction({ gameId: GAME_ID, ply: 3, chunkId: CHUNK_ID });

    expect(result).toEqual({ success: false, error: 'signInRequired' });
    expect(mockIsLinkable).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe('deleteGameChunkAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: CALLER } });
    mockDelete.mockResolvedValue(undefined);
  });

  it('forbids an unrelated user (neither suggester nor game owner)', async () => {
    mockGetForDelete.mockResolvedValue({ suggestedById: SUGGESTER, gameAuthorId: OWNER });

    const { deleteGameChunkAction } = await import('./game-chunks');
    const result = await deleteGameChunkAction(LINK_ID);

    expect(result).toEqual({ success: false, error: 'forbidden' });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('allows the user who added the link', async () => {
    mockGetForDelete.mockResolvedValue({ suggestedById: CALLER, gameAuthorId: OWNER });

    const { deleteGameChunkAction } = await import('./game-chunks');
    const result = await deleteGameChunkAction(LINK_ID);

    expect(result).toEqual({ success: true });
    expect(mockDelete).toHaveBeenCalledWith(LINK_ID);
  });

  it("allows the game's registered owner (even for someone else's link)", async () => {
    mockGetForDelete.mockResolvedValue({ suggestedById: SUGGESTER, gameAuthorId: CALLER });

    const { deleteGameChunkAction } = await import('./game-chunks');
    const result = await deleteGameChunkAction(LINK_ID);

    expect(result).toEqual({ success: true });
    expect(mockDelete).toHaveBeenCalledWith(LINK_ID);
  });

  it('does not treat an anonymous game (null author) as ownable by the caller', async () => {
    mockGetForDelete.mockResolvedValue({ suggestedById: SUGGESTER, gameAuthorId: null });

    const { deleteGameChunkAction } = await import('./game-chunks');
    const result = await deleteGameChunkAction(LINK_ID);

    expect(result).toEqual({ success: false, error: 'forbidden' });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('returns not_found when the link is missing', async () => {
    mockGetForDelete.mockResolvedValue(undefined);

    const { deleteGameChunkAction } = await import('./game-chunks');
    const result = await deleteGameChunkAction(LINK_ID);

    expect(result).toEqual({ success: false, error: 'not_found' });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('returns the guard error and never looks up the link when auth fails', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const { deleteGameChunkAction } = await import('./game-chunks');
    const result = await deleteGameChunkAction(LINK_ID);

    expect(result).toEqual({ success: false, error: 'signInRequired' });
    expect(mockGetForDelete).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
