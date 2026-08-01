import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetRepertoireById = vi.fn();
const mockCreateNotification = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('../repertoires/queries', () => ({
  getRepertoireById: (...args: unknown[]) => mockGetRepertoireById(...args),
}));

// The emitter's own job is owner resolution and the event's shape; dedup,
// mute and block handling are `createNotification`'s, covered in
// `notification.test.ts` against the real DB mock.
vi.mock('./notification', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

const { notifyRepertoireOwnerOfChunkLink } = await import('./repertoire-chunk-link-notification');
const { isMutableNotificationType } = await import('./mutable-types');

describe('notifyRepertoireOwnerOfChunkLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRepertoireById.mockResolvedValue({ userId: 'owner-1' });
  });

  it('notifies the owner, carrying the line, move, chunk and position', async () => {
    notifyRepertoireOwnerOfChunkLink({
      actorId: 'member-1',
      repertoireId: 'rep-1',
      lineNo: 2,
      ply: 6,
      chunkId: 'chunk-1',
      positionKey: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockGetRepertoireById).toHaveBeenCalledWith('rep-1');
    expect(mockCreateNotification).toHaveBeenCalledWith({
      userId: 'owner-1',
      actorId: 'member-1',
      type: 'repertoire_chunk_linked',
      // The repertoire, not the link row: a burst of links by one member in
      // one sitting then collapses into a single notification via the dedup
      // window instead of one row per position.
      targetType: 'repertoire',
      targetId: 'rep-1',
      metadata: {
        repertoireId: 'rep-1',
        lineNo: 2,
        ply: 6,
        chunkId: 'chunk-1',
        positionKey: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -',
      },
    });
  });

  it('stays silent when the owner links a chunk to their own repertoire', async () => {
    mockGetRepertoireById.mockResolvedValue({ userId: 'member-1' });

    notifyRepertoireOwnerOfChunkLink({
      actorId: 'member-1',
      repertoireId: 'rep-1',
      lineNo: 1,
      ply: 4,
      chunkId: 'chunk-1',
      positionKey: 'k',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  // An account-less repertoire has no owner to notify.
  it('stays silent for an account-less repertoire', async () => {
    mockGetRepertoireById.mockResolvedValue({ userId: null });

    notifyRepertoireOwnerOfChunkLink({
      actorId: 'member-1',
      repertoireId: 'rep-1',
      lineNo: 1,
      ply: 4,
      chunkId: 'chunk-1',
      positionKey: 'k',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  // `getRepertoireById` already filters soft-deleted / missing rows to null.
  it('stays silent for a missing or deleted repertoire', async () => {
    mockGetRepertoireById.mockResolvedValue(null);

    notifyRepertoireOwnerOfChunkLink({
      actorId: 'member-1',
      repertoireId: 'rep-1',
      lineNo: 1,
      ply: 4,
      chunkId: 'chunk-1',
      positionKey: 'k',
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('does not throw when the owner lookup fails (fire-and-forget)', async () => {
    mockGetRepertoireById.mockRejectedValue(new Error('db down'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      notifyRepertoireOwnerOfChunkLink({
        actorId: 'member-1',
        repertoireId: 'rep-1',
        lineNo: 1,
        ply: 4,
        chunkId: 'chunk-1',
        positionKey: 'k',
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
    expect(isMutableNotificationType('repertoire_chunk_linked')).toBe(true);
  });
});
