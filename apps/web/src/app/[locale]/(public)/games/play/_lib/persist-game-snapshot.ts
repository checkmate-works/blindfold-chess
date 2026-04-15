import type { LocalStorageGameRepository } from '@/lib/games/local-storage-repository';
import type { Game } from '@/lib/types';

/**
 * Snapshot of the "saveable" part of a game — everything you'd need to create
 * or update a `Game` record, minus the repository-managed metadata (id, date,
 * lastPlayed).
 */
export type GameSnapshot = Omit<Game, 'id' | 'date' | 'lastPlayed'>;

type PersistGameSnapshotOptions = {
  /** Existing game id, if one is already assigned. Used to attempt an update first. */
  gameId: string | undefined;
  /** When updating, controls whether `lastPlayed` should be bumped. */
  updateLastPlayed: boolean;
};

/**
 * Persist a game snapshot to the given repository, deciding create-vs-update
 * based on whether a `gameId` was provided AND whether a record with that id
 * actually still exists.
 *
 * Returns the id the snapshot was saved under (either the existing one, or a
 * freshly minted one when we had to fall back to `create`).
 *
 * This is a pure IO helper: it never touches component state, never fires
 * notifications, and never handles its own errors — callers decide what to do
 * with exceptions (e.g. `GameLimitError`).
 */
export async function persistGameSnapshot(
  repository: LocalStorageGameRepository,
  snapshot: GameSnapshot,
  { gameId, updateLastPlayed }: PersistGameSnapshotOptions
): Promise<string> {
  if (gameId) {
    const existingGame = await repository.load(gameId);
    if (existingGame) {
      await repository.update(gameId, snapshot, { updateLastPlayed });
      return gameId;
    }
  }

  return repository.create(snapshot);
}
