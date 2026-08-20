import { MAX_GAMES } from '@/config';
import { getStartingFen, validateMoveSequence } from '@blindfold-chess/features/chess-core';
import { type Result, err, ok } from '@blindfold-chess/features/utils';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { Game, GameSortOption, SortDirection } from '@/lib/games/saved-game-types';
import { normaliseStoredGame } from '@/lib/games/stored-game-migration';
import { isValidStoredGame } from '@/lib/games/stored-game-validator';

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
      this.saveToStorage(next);
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

      this.saveToStorage(next);
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

    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) {
        this.cachedGames = [];
        return this.cachedGames;
      }

      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        this.cachedGames = [];
        return this.cachedGames;
      }

      // Validate, normalise legacy `skillLevel`-only records into the
      // new `engineConfig` shape, and ensure `lastPlayed` exists. The
      // validator + migrator live in their own modules so this class
      // stays focused on the storage I/O.
      this.cachedGames = parsed
        .filter(isValidStoredGame)
        .map((stored) => normaliseStoredGame(stored));

      return this.cachedGames;
    } catch (error) {
      console.error('Failed to load games from localStorage:', error);
      this.cachedGames = [];
      return this.cachedGames;
    }
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

  async delete(id: string): Promise<void> {
    try {
      const games = await this.ensureCache();
      const filteredGames = games.filter((game) => game.id !== id);
      this.saveToStorage(filteredGames);
      this.cachedGames = filteredGames;
    } catch (error) {
      console.error('Failed to delete game:', error);
      throw new Error('Failed to delete game');
    }
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
   * Throws raw (quota exceeded, storage disabled); the writing method maps
   * the throw to `{ kind: 'storage-failed' }` with the original cause.
   */
  private saveToStorage(games: Game[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(games));
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
