import { MAX_GAMES } from '@/config';
import { Chess } from 'chess.js';

import { GameLimitError } from '@/lib/errors';
import type { AlgebraicNotation } from '@/lib/types';
import type { Game, GameSortOption, SortDirection } from '@/lib/types';

interface IGameRepository {
  create(game: Omit<Game, 'id' | 'date' | 'lastPlayed'>): Promise<string>;
  update(id: string, game: Omit<Game, 'id' | 'date' | 'lastPlayed'>): Promise<void>;
  save(game: Omit<Game, 'id' | 'date' | 'lastPlayed'>, id?: string): Promise<string>;
  load(id: string): Promise<Game | null>;
  loadAll(): Promise<Game[]>;
  loadAllSorted(sortBy: GameSortOption, direction?: SortDirection): Promise<Game[]>;
  delete(id: string): Promise<void>;
  saveMove(gameId: string, move: AlgebraicNotation): Promise<void>;
}

/**
 * LocalStorage implementation of the game repository
 */
export class LocalStorageGameRepository implements IGameRepository {
  private readonly storageKey = 'blindfold_chess_games';

  async create(game: Omit<Game, 'id' | 'date' | 'lastPlayed'>): Promise<string> {
    try {
      // Validate moves before creating
      this.validateMoves(game.moves);

      const games = await this.loadAll();

      // Check game limit before creating new game
      if (games.length >= MAX_GAMES) {
        throw new GameLimitError(`Cannot save game: limit of ${MAX_GAMES} games reached`);
      }

      const gameId = crypto.randomUUID();
      const now = new Date().toISOString();

      games.push({ ...game, id: gameId, date: now, lastPlayed: now });
      this.saveToStorage(games);

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

  async update(id: string, game: Omit<Game, 'id' | 'date' | 'lastPlayed'>): Promise<void> {
    try {
      // Validate moves before updating
      this.validateMoves(game.moves);

      const games = await this.loadAll();
      const index = games.findIndex((g) => g.id === id);

      if (index === -1) {
        throw new Error(`Game with ID ${id} not found`);
      }

      const now = new Date().toISOString();
      games[index] = { ...game, id, date: games[index].date, lastPlayed: now };

      this.saveToStorage(games);
    } catch (error) {
      console.error('Failed to update game:', error);
      throw error;
    }
  }

  /**
   * @deprecated Use create() for new games or update() for existing games instead.
   * This method is kept for backward compatibility.
   */
  async save(game: Omit<Game, 'id' | 'date' | 'lastPlayed'>, id?: string): Promise<string> {
    try {
      if (id) {
        // Try to update existing game
        const existingGame = await this.load(id);
        if (existingGame) {
          await this.update(id, game);
          return id;
        } else {
          // ID provided but game doesn't exist, create new with same ID attempt
          // This is legacy behavior - in new code, this should throw an error
          const games = await this.loadAll();
          if (games.length >= MAX_GAMES) {
            throw new GameLimitError(`Cannot save game: limit of ${MAX_GAMES} games reached`);
          }
          const now = new Date().toISOString();
          games.push({ ...game, id, date: now, lastPlayed: now });
          this.saveToStorage(games);
          return id;
        }
      } else {
        // Create new game
        return await this.create(game);
      }
    } catch (error) {
      // Re-throw GameLimitError as-is
      if (error instanceof GameLimitError) {
        throw error;
      }
      console.error('Failed to save game:', error);
      throw new Error('Failed to save game');
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
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return [];

      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];

      // Validate and filter valid games, and ensure lastPlayed field exists
      return parsed
        .filter(this.isValidGame)
        .map((game) => ({
          ...game,
          // If lastPlayed doesn't exist, use date as fallback
          lastPlayed: game.lastPlayed || game.date,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Failed to load games from localStorage:', error);
      return [];
    }
  }

  async loadAllSorted(sortBy: GameSortOption, direction: SortDirection = 'desc'): Promise<Game[]> {
    try {
      const games = await this.loadAll();

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

      return games.sort(sortFunction);
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

      // Validate the move sequence before saving
      this.validateMoves(updatedMoves);

      await this.update(gameId, {
        moves: updatedMoves,
        playerColor: game.playerColor,
        skillLevel: game.skillLevel,
        status: game.status,
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

  private validateMoves(moves: string[]): void {
    const chess = new Chess();
    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      try {
        const result = chess.move(move);
        if (!result) {
          throw new Error(`Invalid move detected: ${move} at index ${i}`);
        }
      } catch {
        throw new Error(`Invalid move detected during validation: ${move} at index ${i}`);
      }
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
      (g.playerColor === 'white' || g.playerColor === 'black') &&
      typeof g.skillLevel === 'number' &&
      ['in_progress', 'win', 'loss', 'draw'].includes(g.status as string) &&
      (g.lastPlayed === undefined || typeof g.lastPlayed === 'string')
    );
  }
}
