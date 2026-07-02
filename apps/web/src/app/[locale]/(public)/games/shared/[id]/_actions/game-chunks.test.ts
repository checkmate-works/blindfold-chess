import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthenticateAndGuard = vi.fn();
const mockGetForDelete = vi.fn();
const mockDelete = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  authenticateGuardAndRequireProfile: (...args: unknown[]) => mockAuthenticateAndGuard(...args),
}));

vi.mock('@/lib/db/game-chunks', () => ({
  getGameChunkForDelete: (...args: unknown[]) => mockGetForDelete(...args),
  deleteGameChunk: (...args: unknown[]) => mockDelete(...args),
  insertGameChunk: vi.fn(),
  isLinkablePublishedChunk: vi.fn(),
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
