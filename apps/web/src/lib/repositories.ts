import { MAX_GAMES } from '@/config';
import { getStartingFen, validateMoveSequence } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import { GameLimitError } from '@/lib/errors';
import type { Game, GameSortOption, SortDirection } from '@/lib/types';

type UpdateOptions = {
  updateLastPlayed?: boolean;
};

interface IGameRepository {
  create(game: Omit<Game, 'id' | 'date' | 'lastPlayed'>): Promise<string>;
  update(
    id: string,
    game: Omit<Game, 'id' | 'date' | 'lastPlayed'>,
    options?: UpdateOptions
  ): Promise<void>;
  load(id: string): Promise<Game | null>;
  loadAll(): Promise<Game[]>;
  loadAllSorted(sortBy: GameSortOption, direction?: SortDirection): Promise<Game[]>;
  delete(id: string): Promise<void>;
  saveMove(gameId: string, move: AlgebraicNotation): Promise<void>;
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

  async create(game: Omit<Game, 'id' | 'date' | 'lastPlayed'>): Promise<string> {
    try {
      // Validate moves before creating (with custom starting FEN if provided)
      this.validateMoves(game.moves, game.startingFen);

      const games = await this.loadAll();

      // Check game limit before creating new game
      if (games.length >= MAX_GAMES) {
        throw new GameLimitError(`Cannot save game: limit of ${MAX_GAMES} games reached`);
      }

      const gameId = crypto.randomUUID();
      const now = new Date().toISOString();

      const newGame: Game = { ...game, id: gameId, date: now, lastPlayed: now };
      games.push(newGame);
      this.saveToStorage(games);
      this.cachedGames = games;

      return gameId;
    } catch (error) {
      // Re-throw GameLimitError and validation errors as-is
      if (
        error instanceof GameLimitError ||
        (error instanceof Error && error.message.includes('Invalid move'))
      ) {
        throw error;
      }
      console.error('Failed to create game:', error);
      throw new Error('Failed to create game');
    }
  }

  async update(
    id: string,
    game: Omit<Game, 'id' | 'date' | 'lastPlayed'>,
    options?: UpdateOptions
  ): Promise<void> {
    try {
      // Validate moves before updating (with custom starting FEN if provided)
      this.validateMoves(game.moves, game.startingFen);

      const games = await this.loadAll();
      const index = games.findIndex((g) => g.id === id);

      if (index === -1) {
        throw new Error(`Game with ID ${id} not found`);
      }

      const updateLastPlayed = options?.updateLastPlayed ?? true;
      const lastPlayed = updateLastPlayed
        ? new Date().toISOString()
        : (games[index].lastPlayed ?? games[index].date);
      games[index] = { ...game, id, date: games[index].date, lastPlayed };

      this.saveToStorage(games);
      this.cachedGames = games;
    } catch (error) {
      console.error('Failed to update game:', error);
      throw error;
    }
  }

  async load(id: string): Promise<Game | null> {
    try {
      const games = await this.loadAll();
      return games.find((game) => game.id === id) || null;
    } catch (error) {
      console.error('Failed to load game:', error);
      return null;
    }
  }

  async loadAll(): Promise<Game[]> {
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

      // Validate and filter valid games, and ensure lastPlayed field exists
      this.cachedGames = parsed.filter(this.isValidGame).map((game) => ({
        ...game,
        // If lastPlayed doesn't exist, use date as fallback
        lastPlayed: game.lastPlayed || game.date,
      }));

      return this.cachedGames;
    } catch (error) {
      console.error('Failed to load games from localStorage:', error);
      this.cachedGames = [];
      return this.cachedGames;
    }
  }

  async loadAllSorted(sortBy: GameSortOption, direction: SortDirection = 'desc'): Promise<Game[]> {
    try {
      const games = await this.loadAll();

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
      const games = await this.loadAll();
      const filteredGames = games.filter((game) => game.id !== id);
      this.saveToStorage(filteredGames);
      this.cachedGames = filteredGames;
    } catch (error) {
      console.error('Failed to delete game:', error);
      throw new Error('Failed to delete game');
    }
  }

  async saveMove(gameId: string, move: AlgebraicNotation): Promise<void> {
    try {
      const game = await this.load(gameId);
      if (!game) {
        throw new Error(`Game with ID ${gameId} not found`);
      }

      const updatedMoves = [...game.moves, move];

      // Validate the move sequence before saving (with custom starting FEN if present)
      this.validateMoves(updatedMoves, game.startingFen);

      await this.update(gameId, {
        moves: updatedMoves,
        playerColor: game.playerColor,
        skillLevel: game.skillLevel,
        status: game.status,
        startingFen: game.startingFen,
        gamePreferences: game.gamePreferences,
      });
    } catch (error) {
      console.error('Failed to save move:', error);
      throw new Error('Failed to save move');
    }
  }

  private saveToStorage(games: Game[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(games));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      throw new Error('Failed to save to localStorage');
    }
  }

  private validateMoves(moves: string[], startingFen?: string): void {
    const fen = startingFen ?? getStartingFen();
    const result = validateMoveSequence(fen, moves);
    if (!result.valid) {
      throw new Error(`Invalid move detected during validation: ${result.error}`);
    }
  }

  private isValidGame(game: unknown): game is Game {
    if (typeof game !== 'object' || game === null) {
      return false;
    }

    const g = game as Record<string, unknown>;

    return (
      typeof g.id === 'string' &&
      typeof g.date === 'string' &&
      Array.isArray(g.moves) &&
      g.moves.every((m) => typeof m === 'string') &&
      (g.playerColor === 'white' || g.playerColor === 'black') &&
      typeof g.skillLevel === 'number' &&
      ['in_progress', 'win', 'loss', 'draw'].includes(g.status as string) &&
      (g.lastPlayed === undefined || typeof g.lastPlayed === 'string') &&
      (g.startingFen === undefined || typeof g.startingFen === 'string') &&
      (g.gamePreferences === undefined ||
        (typeof g.gamePreferences === 'object' && g.gamePreferences !== null))
    );
  }
}
