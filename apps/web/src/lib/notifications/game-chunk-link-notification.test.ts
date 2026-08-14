import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetLiveGameAuthorId = vi.fn();
const mockCreateNotification = vi.fn();

vi.mock('../db/games-read', () => ({
  getLiveGameAuthorId: (...args: unknown[]) => mockGetLiveGameAuthorId(...args),
}));

// The emitter's own job is owner resolution and the event's shape; dedup,
// mute and block handling are `createNotification`'s, covered in
// `notification.test.ts` against the real DB mock.
vi.mock('./notification', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

const { notifyGameOwnerOfChunkLink } = await import('./game-chunk-link-notification');
const { isMutableNotificationType } = await import('./mutable-types');

describe('notifyGameOwnerOfChunkLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLiveGameAuthorId.mockResolvedValue('owner-1');
  });

  it('notifies the owner, carrying the move and the linked chunk', async () => {
    notifyGameOwnerOfChunkLink({
      actorId: 'member-1',
      gameId: 'game-1',
      ply: 16,
      chunkId: 'chunk-1',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockGetLiveGameAuthorId).toHaveBeenCalledWith('game-1');
    expect(mockCreateNotification).toHaveBeenCalledWith({
      userId: 'owner-1',
      actorId: 'member-1',
      type: 'game_chunk_linked',
      // The game, not the link row: a burst of links by one member in one
      // sitting then collapses into a single notification via the dedup
      // window instead of one row per move.
      targetType: 'game',
      targetId: 'game-1',
      metadata: { gameId: 'game-1', ply: 16, chunkId: 'chunk-1' },
    });
  });

  it('stays silent when the owner links a chunk to their own game', async () => {
    mockGetLiveGameAuthorId.mockResolvedValue('member-1');

    notifyGameOwnerOfChunkLink({
      actorId: 'member-1',
      gameId: 'game-1',
      ply: 4,
      chunkId: 'chunk-1',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  // An account-less game has no owner to notify; a missing / deleted one has
  // nobody either. `getLiveGameAuthorId` distinguishes them (null vs
  // undefined) but both are the same non-event here.
  it('stays silent for an account-less game', async () => {
    mockGetLiveGameAuthorId.mockResolvedValue(null);

    notifyGameOwnerOfChunkLink({
      actorId: 'member-1',
      gameId: 'game-1',
      ply: 4,
      chunkId: 'chunk-1',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('stays silent for a deleted game', async () => {
    mockGetLiveGameAuthorId.mockResolvedValue(undefined);

    notifyGameOwnerOfChunkLink({
      actorId: 'member-1',
      gameId: 'game-1',
      ply: 4,
      chunkId: 'chunk-1',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('does not throw when the owner lookup fails (fire-and-forget)', async () => {
    mockGetLiveGameAuthorId.mockRejectedValue(new Error('db down'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      notifyGameOwnerOfChunkLink({
        actorId: 'member-1',
        gameId: 'game-1',
        ply: 4,
        chunkId: 'chunk-1',
      })
    ).not.toThrow();

    await new Promise((r) => setTimeout(r, 0));

    expect(mockCreateNotification).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  // The owner is not the one who asked for the link, so the notice has to be
  // silenceable — `NotificationItem` only renders the mute toggle for types
  // in this list.
  it('emits a mutable type, so the owner can turn these off', () => {
    expect(isMutableNotificationType('game_chunk_linked')).toBe(true);
  });
});
