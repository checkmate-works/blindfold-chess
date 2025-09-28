import { AlgebraicNotation, Side, SkillLevel } from './types';
import { GameSortOption, SortDirection } from '../../(home)/_lib/types';

export type GameStatus = 'in_progress' | 'win' | 'loss' | 'draw';

export type Game = {
  id: string;
  date: string;
  lastPlayed?: string;
  moves: AlgebraicNotation[];
  playerColor: Side;
  skillLevel: SkillLevel;
  status: GameStatus;
};

interface IGameRepository {
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

  async save(game: Omit<Game, 'id' | 'date' | 'lastPlayed'>, id?: string): Promise<string> {
    try {
      const games = await this.loadAll();
      const gameId = id || crypto.randomUUID();
      const now = new Date().toISOString();

      if (id) {
        // Update existing game
        const index = games.findIndex((g) => g.id === id);
        if (index !== -1) {
          games[index] = { ...game, id, date: games[index].date, lastPlayed: now };
        } else {
          // ID provided but game doesn't exist, create new
          games.push({ ...game, id: gameId, date: now, lastPlayed: now });
        }
      } else {
        // Create new game
        games.push({ ...game, id: gameId, date: now, lastPlayed: now });
      }

      this.saveToStorage(games);
      return gameId;
    } catch (error) {
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
      await this.save(
        {
          moves: updatedMoves,
          playerColor: game.playerColor,
          skillLevel: game.skillLevel,
          status: game.status,
        },
        gameId
      );
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
