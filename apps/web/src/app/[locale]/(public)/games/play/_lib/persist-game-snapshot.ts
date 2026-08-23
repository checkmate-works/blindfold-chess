import { type Result, ok } from '@blindfold-chess/features/utils';

import type {
  GameSaveError,
  LocalStorageGameRepository,
} from '@/lib/games/local-storage-repository';
import type { Game } from '@/lib/games/saved-game-types';

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
 * notifications, and never handles its own failures — the repository's
 * {@link GameSaveError} is passed through for the caller to branch on
 * (e.g. `limit-reached`).
 */
export async function persistGameSnapshot(
  repository: LocalStorageGameRepository,
  snapshot: GameSnapshot,
  { gameId, updateLastPlayed }: PersistGameSnapshotOptions
): Promise<Result<string, GameSaveError>> {
  if (gameId) {
    const existingGame = await repository.load(gameId);
    if (existingGame) {
      // The charge a game was started on is fixed for its life, and only the
      // fresh-game URL ever carries it — a resumed session's snapshot has
      // none — so an absent value means "unchanged", never "cleared".
      const maiaChargeId = snapshot.maiaChargeId ?? existingGame.maiaChargeId;
      const updated = await repository.update(
        gameId,
        { ...snapshot, maiaChargeId },
        { updateLastPlayed }
      );
      if (!updated.ok) return updated;
      return ok(gameId);
    }
  }

  return repository.create(snapshot);
}
