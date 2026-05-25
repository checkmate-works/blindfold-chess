import { MAX_GAMES } from '@/config';
import { isValidSkillLevel } from '@blindfold-chess/features/ai-game';
import { getStartingFen, validateMoveSequence } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import { type EngineConfig, isEngineConfig } from '@/lib/engines';
import { GameLimitError } from '@/lib/errors';
import {
  type BoardVisibility,
  isBoardVisibility,
  legacyToBoardVisibility,
} from '@/lib/games/board-visibility';
import type {
  Game,
  GameSortOption,
  PreferenceChangeLogEntry,
  SkillLevel,
  SortDirection,
  StoredGame,
} from '@/lib/games/saved-game-types';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

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

      // Validate, normalise legacy `skillLevel`-only records into the new
      // `engineConfig` shape, and ensure `lastPlayed` exists.
      this.cachedGames = parsed
        .filter(this.isValidStoredGame)
        .map((stored: StoredGame) => this.normaliseStoredGame(stored));

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
        engineConfig: game.engineConfig,
        status: game.status,
        startingFen: game.startingFen,
        gamePreferences: game.gamePreferences,
        preferenceChangeLog: game.preferenceChangeLog,
        operationLogs: game.operationLogs,
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

  /**
   * Accept either the legacy `skillLevel`-only shape or the new
   * `engineConfig` shape — at least one must be present and valid.
   * Records older than the EngineConfig migration only carry
   * `skillLevel`; everything written after the migration carries
   * `engineConfig`. {@link normaliseStoredGame} folds both into the
   * single in-app {@link Game} representation.
   */
  private isValidStoredGame(stored: unknown): stored is StoredGame {
    if (typeof stored !== 'object' || stored === null) {
      return false;
    }

    const g = stored as Record<string, unknown>;

    const hasLegacySkillLevel = typeof g.skillLevel === 'number' && isValidSkillLevel(g.skillLevel);
    const hasNewEngineConfig = isEngineConfig(g.engineConfig);

    return (
      typeof g.id === 'string' &&
      typeof g.date === 'string' &&
      Array.isArray(g.moves) &&
      g.moves.every((m) => typeof m === 'string') &&
      (g.playerColor === 'white' || g.playerColor === 'black') &&
      (hasLegacySkillLevel || hasNewEngineConfig) &&
      ['in_progress', 'win', 'loss', 'draw'].includes(g.status as string) &&
      (g.lastPlayed === undefined || typeof g.lastPlayed === 'string') &&
      (g.startingFen === undefined || typeof g.startingFen === 'string') &&
      (g.gamePreferences === undefined ||
        (typeof g.gamePreferences === 'object' && g.gamePreferences !== null)) &&
      (g.operationLogs === undefined ||
        (Array.isArray(g.operationLogs) &&
          g.operationLogs.every(
            (log) =>
              typeof log === 'object' &&
              log !== null &&
              ['text', 'text-autocomplete', 'select', 'button', 'board'].includes(
                (log as Record<string, unknown>).inputMethod as string
              ) &&
              typeof (log as Record<string, unknown>).peekCount === 'number' &&
              typeof (log as Record<string, unknown>).undoCount === 'number' &&
              (typeof (log as Record<string, unknown>).movePeekCount === 'number' ||
                (log as Record<string, unknown>).movePeekCount === undefined) &&
              (typeof (log as Record<string, unknown>).invalidCount === 'number' ||
                (log as Record<string, unknown>).invalidCount === undefined)
          ))) &&
      (g.preferenceChangeLog === undefined ||
        (Array.isArray(g.preferenceChangeLog) &&
          g.preferenceChangeLog.every((entry) =>
            LocalStorageGameRepository.isValidPreferenceChangeEntry(entry)
          )))
    );
  }

  /**
   * Validate a single {@link PreferenceChangeLogEntry} from disk. Pulled
   * out of {@link isValidStoredGame} so the discriminated-union check is
   * readable: a malformed entry must have the right `key` AND a `from`/`to`
   * pair of the correct shape for that key.
   */
  private static isValidPreferenceChangeEntry(entry: unknown): boolean {
    if (typeof entry !== 'object' || entry === null) return false;
    const e = entry as Record<string, unknown>;
    if (typeof e.atMoveIndex !== 'number' || e.atMoveIndex < 0) return false;

    switch (e.key) {
      // Legacy boolean key — accepted at the validator boundary so the record
      // loads, then transformed to a 'boardVisibility' entry by
      // `normaliseStoredGame` so the in-app representation is uniform.
      case 'showBoardButtonInGame':
        return typeof e.from === 'boolean' && typeof e.to === 'boolean';
      case 'highlightLastMove':
      case 'showOwnPieces':
      case 'showOpponentPieces':
        return typeof e.from === 'boolean' && typeof e.to === 'boolean';
      case 'pieceShapeMode': {
        const shapes = ['normal', 'circles-all', 'circles-own', 'circles-opponent'];
        return shapes.includes(e.from as string) && shapes.includes(e.to as string);
      }
      case 'pieceColors': {
        const colors = ['normal', 'white-only', 'black-only'];
        return colors.includes(e.from as string) && colors.includes(e.to as string);
      }
      case 'peekMode': {
        const modes = ['modal', 'inline'];
        return modes.includes(e.from as string) && modes.includes(e.to as string);
      }
      case 'boardVisibility': {
        return isBoardVisibility(e.from) && isBoardVisibility(e.to);
      }
      default:
        return false;
    }
  }

  /**
   * Migrate one preference-change entry from the legacy on-disk shape to the
   * in-app shape. Currently only `showBoardButtonInGame` boolean entries need
   * transformation — the other keys round-trip unchanged.
   *
   * Pre-condition: `entry` has already passed `isValidPreferenceChangeEntry`,
   * so the unsafe casts below are sound at the type-check boundary.
   */
  private static migrateChangeLogEntry(entry: Record<string, unknown>): PreferenceChangeLogEntry {
    if (entry.key === 'showBoardButtonInGame') {
      return {
        atMoveIndex: entry.atMoveIndex as number,
        key: 'boardVisibility',
        from: legacyToBoardVisibility(entry.from as boolean),
        to: legacyToBoardVisibility(entry.to as boolean),
      };
    }
    return entry as unknown as PreferenceChangeLogEntry;
  }

  /**
   * Migrate the per-game preferences object from its legacy shape (with
   * `showBoardButtonInGame: boolean`) to the in-app shape (with
   * `boardVisibility: BoardVisibility`). Idempotent: records that already
   * carry `boardVisibility` are returned unchanged, with the legacy field
   * stripped if it happens to coexist.
   */
  private static migrateGamePreferences(
    prefs: Record<string, unknown> | undefined
  ): PerGamePreferences | undefined {
    if (!prefs) return undefined;
    const { showBoardButtonInGame: legacy, boardVisibility: existing, ...rest } = prefs;
    let boardVisibility: BoardVisibility;
    if (isBoardVisibility(existing)) {
      boardVisibility = existing;
    } else if (typeof legacy === 'boolean') {
      boardVisibility = legacyToBoardVisibility(legacy);
    } else {
      // Neither present — should not happen for records with a gamePreferences
      // object since the validator requires the field to be an object, but
      // for defensive completeness we fall back to the default behavior.
      boardVisibility = 'peek';
    }
    return { ...rest, boardVisibility } as PerGamePreferences;
  }

  /**
   * Promote a {@link StoredGame} (which may be in either legacy or new
   * format) into the strict in-app {@link Game}. Legacy records whose
   * only difficulty hint is `skillLevel` are assumed Stockfish — there
   * was no other engine before the migration, so the assumption is
   * exact, not heuristic. The legacy `skillLevel` field is dropped from
   * the returned object so downstream code only ever pattern-matches
   * on `engineConfig`.
   */
  private normaliseStoredGame(stored: StoredGame): Game {
    const { skillLevel: legacySkillLevel, engineConfig: storedConfig, ...rest } = stored;
    const engineConfig: EngineConfig =
      storedConfig ??
      ({
        kind: 'stockfish',
        skillLevel: (legacySkillLevel ?? 5) as SkillLevel,
      } as const);

    // Promote any legacy `showBoardButtonInGame` boolean to the new
    // `boardVisibility` enum on read so the in-memory `Game` shape never
    // contains the legacy field. The next save then persists the migrated
    // shape forward-compatibly.
    const gamePreferences = LocalStorageGameRepository.migrateGamePreferences(
      rest.gamePreferences as unknown as Record<string, unknown> | undefined
    );
    const preferenceChangeLog = rest.preferenceChangeLog?.map((entry) =>
      LocalStorageGameRepository.migrateChangeLogEntry(entry as unknown as Record<string, unknown>)
    );

    return {
      ...rest,
      engineConfig,
      gamePreferences,
      preferenceChangeLog,
      // If lastPlayed doesn't exist, use date as fallback
      lastPlayed: rest.lastPlayed || rest.date,
    };
  }
}
