import { MAX_GAMES } from '@/config';
import { getStartingFen, validateMoveSequence } from '@blindfold-chess/features/chess-core';
import { type Result, err, ok } from '@blindfold-chess/features/utils';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { Game, GameSortOption, SortDirection } from '@/lib/games/saved-game-types';
import { normaliseStoredGame } from '@/lib/games/stored-game-migration';
import { isValidStoredGame } from '@/lib/games/stored-game-validator';
import { readJson, writeJson } from '@/lib/persistent-settings/local-storage-adapter';

type UpdateOptions = {
  updateLastPlayed?: boolean;
};

/**
 * Everything a game write can fail with, as a value. The save flows branch
 * on `kind` — `limit-reached` drives the game-limit UI, `invalid-moves`
 * signals a corrupt move sequence (a data-integrity red flag, not a user
 * mistake) — so failures used to travel as thrown `Error`s told apart by
 * message substrings, which silently reclassified on any reword.
 */
export type GameSaveError =
  | { readonly kind: 'limit-reached'; readonly limit: number }
  | { readonly kind: 'invalid-moves'; readonly detail: string }
  | { readonly kind: 'not-found'; readonly id: string }
  | { readonly kind: 'storage-failed'; readonly cause: unknown };

interface IGameRepository {
  create(game: Omit<Game, 'id' | 'date' | 'lastPlayed'>): Promise<Result<string, GameSaveError>>;
  update(
    id: string,
    game: Omit<Game, 'id' | 'date' | 'lastPlayed'>,
    options?: UpdateOptions
  ): Promise<Result<void, GameSaveError>>;
  load(id: string): Promise<Game | null>;
  loadAll(): Promise<Game[]>;
  loadAllSorted(sortBy: GameSortOption, direction?: SortDirection): Promise<Game[]>;
  delete(id: string): Promise<void>;
  saveMove(gameId: string, move: AlgebraicNotation): Promise<Result<void, GameSaveError>>;
}

/**
 * LocalStorage implementation of the game repository
 *
 * Uses an in-memory cache to avoid repeated JSON parsing, validation,
 * and sorting on every method call. The cache is invalidated and
 * rebuilt only when data is first loaded or after a write operation
 * updates both localStorage and the cache simultaneously.
 *
 * Single-tab assumption: no cross-tab synchronization is performed.
 */
export class LocalStorageGameRepository implements IGameRepository {
  private readonly storageKey = 'blindfold_chess_games';
  private cachedGames: Game[] | null = null;

  async create(
    game: Omit<Game, 'id' | 'date' | 'lastPlayed'>
  ): Promise<Result<string, GameSaveError>> {
    // Validate moves before creating (with custom starting FEN if provided)
    const invalid = this.validateMoves(game.moves, game.startingFen);
    if (invalid) return err(invalid);

    try {
      const games = await this.ensureCache();

      // Check game limit before creating new game
      if (games.length >= MAX_GAMES) {
        return err({ kind: 'limit-reached', limit: MAX_GAMES });
      }

      const gameId = crypto.randomUUID();
      const now = new Date().toISOString();

      const newGame: Game = { ...game, id: gameId, date: now, lastPlayed: now };
      const next = [...games, newGame];
      const written = this.saveToStorage(next);
      // Only adopt the new list once the browser has taken it. Caching a list
      // the write never stored would leave the session reading back a game
      // that is not there — every later read is served from this field, so
      // the app would show the move as saved and lose it on reload.
      if (!written.ok) return err({ kind: 'storage-failed', cause: written.error });
      this.cachedGames = next;

      return ok(gameId);
    } catch (cause) {
      console.error('Failed to create game:', cause);
      return err({ kind: 'storage-failed', cause });
    }
  }

  async update(
    id: string,
    game: Omit<Game, 'id' | 'date' | 'lastPlayed'>,
    options?: UpdateOptions
  ): Promise<Result<void, GameSaveError>> {
    // Validate moves before updating (with custom starting FEN if provided)
    const invalid = this.validateMoves(game.moves, game.startingFen);
    if (invalid) return err(invalid);

    try {
      const games = await this.ensureCache();
      const index = games.findIndex((g) => g.id === id);

      if (index === -1) {
        return err({ kind: 'not-found', id });
      }

      const updateLastPlayed = options?.updateLastPlayed ?? true;
      const lastPlayed = updateLastPlayed
        ? new Date().toISOString()
        : (games[index].lastPlayed ?? games[index].date);
      const next = [...games];
      next[index] = { ...game, id, date: games[index].date, lastPlayed };

      const written = this.saveToStorage(next);
      // As in `create`: the cache only moves forward if the write landed.
      if (!written.ok) return err({ kind: 'storage-failed', cause: written.error });
      this.cachedGames = next;
      return ok(undefined);
    } catch (cause) {
      console.error('Failed to update game:', cause);
      return err({ kind: 'storage-failed', cause });
    }
  }

  async load(id: string): Promise<Game | null> {
    try {
      const games = await this.ensureCache();
      return games.find((game) => game.id === id) || null;
    } catch (error) {
      console.error('Failed to load game:', error);
      return null;
    }
  }

  async loadAll(): Promise<Game[]> {
    // Copy on the way out: handing callers the live cache array would let
    // them mutate the cache (silently diverging from localStorage) and let
    // our own writes mutate arrays callers are still holding.
    return [...(await this.ensureCache())];
  }

  /** The live cache array — internal use only; must never escape this class. */
  private async ensureCache(): Promise<Game[]> {
    if (this.cachedGames !== null) {
      return this.cachedGames;
    }

    // `readJson` absorbs the missing key, the browser that refuses to be read
    // at all, and the unparseable payload into the same fallback, so an empty
    // list is the answer to all three. That matches what this method already
    // did; the point of routing through it is that the app now has one answer
    // to "the browser will not store" instead of a per-caller one.
    const parsed = readJson<unknown>(this.storageKey, null);
    if (!Array.isArray(parsed)) {
      this.cachedGames = [];
      return this.cachedGames;
    }

    try {
      // Validate, normalise legacy `skillLevel`-only records into the
      // new `engineConfig` shape, and ensure `lastPlayed` exists. The
      // validator + migrator live in their own modules so this class
      // stays focused on the storage I/O.
      this.cachedGames = parsed
        .filter(isValidStoredGame)
        .map((stored) => normaliseStoredGame(stored));
    } catch (error) {
      // A record that gets past the validator but trips the migrator would
      // otherwise take down every screen that lists games. One unreadable
      // payload costs the user their local history; it should not also cost
      // them the page.
      console.error('Failed to normalise stored games:', error);
      this.cachedGames = [];
    }

    return this.cachedGames;
  }

  async loadAllSorted(sortBy: GameSortOption, direction: SortDirection = 'desc'): Promise<Game[]> {
    try {
      const games = await this.ensureCache();

      // Return a sorted copy so we don't mutate the cached array
      const sortedGames = [...games];

      const sortFunction = (a: Game, b: Game) => {
        let aValue: string;
        let bValue: string;

        if (sortBy === 'lastPlayed') {
          aValue = a.lastPlayed || a.date;
          bValue = b.lastPlayed || b.date;
        } else {
          aValue = a.date;
          bValue = b.date;
        }

        const aTime = new Date(aValue).getTime();
        const bTime = new Date(bValue).getTime();

        return direction === 'desc' ? bTime - aTime : aTime - bTime;
      };

      return sortedGames.sort(sortFunction);
    } catch (error) {
      console.error('Failed to load sorted games:', error);
      return [];
    }
  }

  /**
   * Remove a game, throwing if the browser would not store the shortened list.
   *
   * This is the one write here that still signals by throwing, and it is not
   * an oversight: all four call sites await it inside a try/catch and use the
   * rejection to tell the user the deletion did not happen — an error toast on
   * the home game list and on bulk delete, inline error text on the result
   * page. A deletion that silently does not delete is worse than a failed one,
   * because the row is still there on the next render with no explanation.
   *
   * `create` and `update` report through `Result` instead because their
   * failure has no such consumer: the auto-save loop logs it and moves on.
   */
  async delete(id: string): Promise<void> {
    const games = await this.ensureCache();
    const filteredGames = games.filter((game) => game.id !== id);
    const written = this.saveToStorage(filteredGames);
    if (!written.ok) {
      console.error('Failed to delete game:', written.error);
      throw new Error('Failed to delete game', { cause: written.error });
    }
    this.cachedGames = filteredGames;
  }

  async saveMove(gameId: string, move: AlgebraicNotation): Promise<Result<void, GameSaveError>> {
    const game = await this.load(gameId);
    if (!game) {
      return err({ kind: 'not-found', id: gameId });
    }

    // `update` re-validates the extended move sequence before writing.
    return this.update(gameId, {
      moves: [...game.moves, move],
      playerColor: game.playerColor,
      engineConfig: game.engineConfig,
      status: game.status,
      startingFen: game.startingFen,
      gamePreferences: game.gamePreferences,
      preferenceChangeLog: game.preferenceChangeLog,
      operationLogs: game.operationLogs,
    });
  }

  /**
   * Hand the full game list to the shared `localStorage` entry point.
   *
   * The outcome comes back as a value rather than a throw. Every caller must
   * check it before touching `cachedGames`: a failed write that still advanced
   * the cache would leave the rest of the session reading a list the browser
   * never took, so the save would look successful until the next reload.
   */
  private saveToStorage(games: Game[]): Result<void, unknown> {
    return writeJson(this.storageKey, games);
  }

  private validateMoves(moves: string[], startingFen?: string): GameSaveError | null {
    const fen = startingFen ?? getStartingFen();
    const result = validateMoveSequence(fen, moves);
    if (!result.valid) {
      return { kind: 'invalid-moves', detail: result.error ?? 'unknown' };
    }
    return null;
  }
}
