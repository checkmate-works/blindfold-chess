import { MAX_GAMES } from '@/config';
import { beforeEach, describe, expect, it } from 'vitest';

import { GameLimitError } from '../errors';
import { LocalStorageGameRepository } from './local-storage-repository';

describe('LocalStorageGameRepository', () => {
  let repository: LocalStorageGameRepository;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    repository = new LocalStorageGameRepository();
  });

  describe('game limit enforcement', () => {
    it('should allow creating games up to the limit', async () => {
      for (let i = 0; i < MAX_GAMES; i++) {
        const gameId = await repository.create({
          moves: [],
          playerColor: 'white',
          engineConfig: { kind: 'stockfish', skillLevel: 5 },
          status: 'in_progress',
        });
        expect(gameId).toBeDefined();
      }

      const games = await repository.loadAll();
      expect(games.length).toBe(MAX_GAMES);
    });

    it('should throw GameLimitError when creating a new game beyond the limit', async () => {
      for (let i = 0; i < MAX_GAMES; i++) {
        await repository.create({
          moves: [],
          playerColor: 'white',
          engineConfig: { kind: 'stockfish', skillLevel: 5 },
          status: 'in_progress',
        });
      }

      await expect(
        repository.create({
          moves: [],
          playerColor: 'black',
          engineConfig: { kind: 'stockfish', skillLevel: 10 },
          status: 'in_progress',
        })
      ).rejects.toThrow(GameLimitError);
    });

    it('should allow updating an existing game even when at the limit', async () => {
      const gameIds: string[] = [];
      for (let i = 0; i < MAX_GAMES; i++) {
        const gameId = await repository.create({
          moves: [],
          playerColor: 'white',
          engineConfig: { kind: 'stockfish', skillLevel: 5 },
          status: 'in_progress',
        });
        gameIds.push(gameId);
      }

      await repository.update(gameIds[0], {
        moves: ['e4', 'e5'],
        playerColor: 'white',
        engineConfig: { kind: 'stockfish', skillLevel: 5 },
        status: 'in_progress',
      });

      const game = await repository.load(gameIds[0]);
      expect(game?.moves).toEqual(['e4', 'e5']);

      const games = await repository.loadAll();
      expect(games.length).toBe(MAX_GAMES);
    });

    it('should include correct error message with limit value', async () => {
      for (let i = 0; i < MAX_GAMES; i++) {
        await repository.create({
          moves: [],
          playerColor: 'white',
          engineConfig: { kind: 'stockfish', skillLevel: 5 },
          status: 'in_progress',
        });
      }

      try {
        await repository.create({
          moves: [],
          playerColor: 'black',
          engineConfig: { kind: 'stockfish', skillLevel: 10 },
          status: 'in_progress',
        });
        expect.fail('Should have thrown GameLimitError');
      } catch (error) {
        expect(error).toBeInstanceOf(GameLimitError);
        if (error instanceof GameLimitError) {
          expect(error.message).toContain(`${MAX_GAMES}`);
        }
      }
    });
  });

  describe('create', () => {
    it('should create a new game and return its ID', async () => {
      const gameId = await repository.create({
        moves: ['e4'],
        playerColor: 'white',
        engineConfig: { kind: 'stockfish', skillLevel: 10 },
        status: 'in_progress',
      });

      expect(gameId).toBeDefined();
      expect(typeof gameId).toBe('string');

      const game = await repository.load(gameId);
      expect(game).toBeDefined();
      expect(game?.moves).toEqual(['e4']);
      expect(game?.playerColor).toBe('white');
      expect(game?.engineConfig).toEqual({ kind: 'stockfish', skillLevel: 10 });
      expect(game?.status).toBe('in_progress');
    });

    it('should generate a unique UUID for each game', async () => {
      const gameId1 = await repository.create({
        moves: [],
        playerColor: 'white',
        engineConfig: { kind: 'stockfish', skillLevel: 5 },
        status: 'in_progress',
      });

      const gameId2 = await repository.create({
        moves: [],
        playerColor: 'black',
        engineConfig: { kind: 'stockfish', skillLevel: 5 },
        status: 'in_progress',
      });

      expect(gameId1).not.toBe(gameId2);
    });

    it('should set date and lastPlayed to current time', async () => {
      const beforeCreate = new Date().toISOString();
      const gameId = await repository.create({
        moves: [],
        playerColor: 'white',
        engineConfig: { kind: 'stockfish', skillLevel: 5 },
        status: 'in_progress',
      });
      const afterCreate = new Date().toISOString();

      const game = await repository.load(gameId);
      expect(game?.date).toBeDefined();
      expect(game?.lastPlayed).toBeDefined();
      expect(game?.date).toBe(game?.lastPlayed);

      // Check that timestamps are within reasonable range
      expect(game!.date >= beforeCreate).toBe(true);
      expect(game!.date <= afterCreate).toBe(true);
    });

    it('should throw GameLimitError when limit is reached', async () => {
      // Fill up to MAX_GAMES
      for (let i = 0; i < MAX_GAMES; i++) {
        await repository.create({
          moves: [],
          playerColor: 'white',
          engineConfig: { kind: 'stockfish', skillLevel: 5 },
          status: 'in_progress',
        });
      }

      // Attempt to create one more
      await expect(
        repository.create({
          moves: [],
          playerColor: 'black',
          engineConfig: { kind: 'stockfish', skillLevel: 10 },
          status: 'in_progress',
        })
      ).rejects.toThrow(GameLimitError);
    });
  });

  describe('update', () => {
    it('should update an existing game', async () => {
      const gameId = await repository.create({
        moves: ['e4'],
        playerColor: 'white',
        engineConfig: { kind: 'stockfish', skillLevel: 5 },
        status: 'in_progress',
      });

      await repository.update(gameId, {
        moves: ['e4', 'e5', 'Nf3'],
        playerColor: 'white',
        engineConfig: { kind: 'stockfish', skillLevel: 5 },
        status: 'in_progress',
      });

      const game = await repository.load(gameId);
      expect(game?.moves).toEqual(['e4', 'e5', 'Nf3']);
    });

    it('should preserve the creation date', async () => {
      const gameId = await repository.create({
        moves: [],
        playerColor: 'white',
        engineConfig: { kind: 'stockfish', skillLevel: 5 },
        status: 'in_progress',
      });

      const originalGame = await repository.load(gameId);
      const originalDate = originalGame!.date;

      // Wait a bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await repository.update(gameId, {
        moves: ['e4'],
        playerColor: 'white',
        engineConfig: { kind: 'stockfish', skillLevel: 5 },
        status: 'in_progress',
      });

      const updatedGame = await repository.load(gameId);
      expect(updatedGame?.date).toBe(originalDate);
    });

    it('should update lastPlayed timestamp by default', async () => {
      const gameId = await repository.create({
        moves: [],
        playerColor: 'white',
        engineConfig: { kind: 'stockfish', skillLevel: 5 },
        status: 'in_progress',
      });

      const originalGame = await repository.load(gameId);
      expect(originalGame).toBeDefined();
      expect(originalGame!.lastPlayed).toBeDefined();
      const originalLastPlayed = originalGame!.lastPlayed!;

      // Wait a bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await repository.update(gameId, {
        moves: ['e4'],
        playerColor: 'white',
        engineConfig: { kind: 'stockfish', skillLevel: 5 },
        status: 'in_progress',
      });

      const updatedGame = await repository.load(gameId);
      expect(updatedGame).toBeDefined();
      expect(updatedGame!.lastPlayed).toBeDefined();
      expect(updatedGame!.lastPlayed).not.toBe(originalLastPlayed);
      expect(updatedGame!.lastPlayed! > originalLastPlayed).toBe(true);
    });

    it('should not update lastPlayed when updateLastPlayed is false', async () => {
      const gameId = await repository.create({
        moves: [],
        playerColor: 'white',
        engineConfig: { kind: 'stockfish', skillLevel: 5 },
        status: 'in_progress',
      });

      const originalGame = await repository.load(gameId);
      const originalLastPlayed = originalGame!.lastPlayed!;

      // Wait a bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await repository.update(
        gameId,
        {
          moves: [],
          playerColor: 'white',
          engineConfig: { kind: 'stockfish', skillLevel: 5 },
          status: 'in_progress',
        },
        { updateLastPlayed: false }
      );

      const updatedGame = await repository.load(gameId);
      expect(updatedGame!.lastPlayed).toBe(originalLastPlayed);
    });

    it('should update lastPlayed when updateLastPlayed is explicitly true', async () => {
      const gameId = await repository.create({
        moves: [],
        playerColor: 'white',
        engineConfig: { kind: 'stockfish', skillLevel: 5 },
        status: 'in_progress',
      });

      const originalGame = await repository.load(gameId);
      const originalLastPlayed = originalGame!.lastPlayed!;

      // Wait a bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await repository.update(
        gameId,
        {
          moves: ['e4'],
          playerColor: 'white',
          engineConfig: { kind: 'stockfish', skillLevel: 5 },
          status: 'in_progress',
        },
        { updateLastPlayed: true }
      );

      const updatedGame = await repository.load(gameId);
      expect(updatedGame!.lastPlayed).not.toBe(originalLastPlayed);
      expect(updatedGame!.lastPlayed! > originalLastPlayed).toBe(true);
    });

    it('should preserve lastPlayed with updateLastPlayed false even when moves change', async () => {
      const gameId = await repository.create({
        moves: ['e4'],
        playerColor: 'white',
        engineConfig: { kind: 'stockfish', skillLevel: 5 },
        status: 'in_progress',
      });

      const originalGame = await repository.load(gameId);
      const originalLastPlayed = originalGame!.lastPlayed!;

      // Wait a bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Update with new moves but updateLastPlayed: false (simulating initial sync save)
      await repository.update(
        gameId,
        {
          moves: ['e4', 'e5'],
          playerColor: 'white',
          engineConfig: { kind: 'stockfish', skillLevel: 5 },
          status: 'in_progress',
        },
        { updateLastPlayed: false }
      );

      const updatedGame = await repository.load(gameId);
      expect(updatedGame!.moves).toEqual(['e4', 'e5']);
      expect(updatedGame!.lastPlayed).toBe(originalLastPlayed);
    });

    it('should update lastPlayed when options is an empty object', async () => {
      const gameId = await repository.create({
        moves: [],
        playerColor: 'white',
        engineConfig: { kind: 'stockfish', skillLevel: 5 },
        status: 'in_progress',
      });

      const originalGame = await repository.load(gameId);
      const originalLastPlayed = originalGame!.lastPlayed!;

      // Wait a bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Empty options object: updateLastPlayed is undefined, so it defaults to true
      await repository.update(
        gameId,
        {
          moves: ['e4'],
          playerColor: 'white',
          engineConfig: { kind: 'stockfish', skillLevel: 5 },
          status: 'in_progress',
        },
        {}
      );

      const updatedGame = await repository.load(gameId);
      expect(updatedGame!.lastPlayed).not.toBe(originalLastPlayed);
      expect(updatedGame!.lastPlayed! > originalLastPlayed).toBe(true);
    });

    it('should fall back to date when updateLastPlayed is false and game has no lastPlayed', async () => {
      // Manually insert a game record without lastPlayed to simulate legacy data
      const gameId = crypto.randomUUID();
      const creationDate = '2024-01-01T00:00:00.000Z';
      const legacyGame = {
        id: gameId,
        date: creationDate,
        moves: [] as string[],
        playerColor: 'white',
        engineConfig: { kind: 'stockfish', skillLevel: 5 },
        status: 'in_progress',
        // No lastPlayed field — simulating a legacy record
      };
      localStorage.setItem('blindfold_chess_games', JSON.stringify([legacyGame]));

      // Update with updateLastPlayed: false — should fall back to date
      await repository.update(
        gameId,
        {
          moves: [],
          playerColor: 'white',
          engineConfig: { kind: 'stockfish', skillLevel: 5 },
          status: 'in_progress',
        },
        { updateLastPlayed: false }
      );

      const updatedGame = await repository.load(gameId);
      // The fallback chain: games[index].lastPlayed ?? games[index].date
      // Since loadAll() already normalizes lastPlayed from date, the value should be creationDate
      expect(updatedGame!.lastPlayed).toBe(creationDate);
    });

    it('should throw error when game does not exist', async () => {
      const nonExistentId = 'non-existent-id-12345';

      await expect(
        repository.update(nonExistentId, {
          moves: ['e4'],
          playerColor: 'white',
          engineConfig: { kind: 'stockfish', skillLevel: 5 },
          status: 'in_progress',
        })
      ).rejects.toThrow('Game with ID non-existent-id-12345 not found');
    });

    it('should allow updating when at game limit', async () => {
      // Fill up to MAX_GAMES
      const gameIds: string[] = [];
      for (let i = 0; i < MAX_GAMES; i++) {
        const gameId = await repository.create({
          moves: [],
          playerColor: 'white',
          engineConfig: { kind: 'stockfish', skillLevel: 5 },
          status: 'in_progress',
        });
        gameIds.push(gameId);
      }

      // Update should succeed even at limit
      await repository.update(gameIds[0], {
        moves: ['e4', 'e5'],
        playerColor: 'white',
        engineConfig: { kind: 'stockfish', skillLevel: 5 },
        status: 'in_progress',
      });

      const game = await repository.load(gameIds[0]);
      expect(game?.moves).toEqual(['e4', 'e5']);

      // Verify count is still MAX_GAMES
      const games = await repository.loadAll();
      expect(games.length).toBe(MAX_GAMES);
    });

    it('should update skill level correctly', async () => {
      const gameId = await repository.create({
        moves: ['e4'],
        playerColor: 'white',
        engineConfig: { kind: 'stockfish', skillLevel: 5 },
        status: 'in_progress',
      });

      await repository.update(gameId, {
        moves: ['e4'],
        playerColor: 'white',
        engineConfig: { kind: 'stockfish', skillLevel: 15 },
        status: 'in_progress',
      });

      const game = await repository.load(gameId);
      expect(game?.engineConfig).toEqual({ kind: 'stockfish', skillLevel: 15 });
    });

    it('should update game status correctly', async () => {
      const gameId = await repository.create({
        moves: ['e4', 'e5'],
        playerColor: 'white',
        engineConfig: { kind: 'stockfish', skillLevel: 5 },
        status: 'in_progress',
      });

      await repository.update(gameId, {
        moves: ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#'],
        playerColor: 'white',
        engineConfig: { kind: 'stockfish', skillLevel: 5 },
        status: 'win',
      });

      const game = await repository.load(gameId);
      expect(game?.status).toBe('win');
    });
  });

  describe('legacy format migration on read', () => {
    it('normalises a record with only the legacy skillLevel field into a Stockfish engineConfig', async () => {
      // Hand-craft a localStorage payload in the pre-migration shape — this is
      // exactly what older builds wrote, and what existing users still have on
      // disk. The repository must read it back as a valid Stockfish game
      // without losing any data.
      const legacyPayload = [
        {
          id: 'legacy-1',
          date: '2025-01-01T00:00:00.000Z',
          lastPlayed: '2025-01-02T00:00:00.000Z',
          moves: ['e4', 'e5'],
          playerColor: 'white',
          skillLevel: 12,
          status: 'in_progress',
        },
      ];
      localStorage.setItem('blindfold_chess_games', JSON.stringify(legacyPayload));

      const fresh = new LocalStorageGameRepository();
      const game = await fresh.load('legacy-1');

      expect(game).not.toBeNull();
      expect(game?.engineConfig).toEqual({ kind: 'stockfish', skillLevel: 12 });
      // Legacy top-level `skillLevel` is stripped from the in-app shape.
      expect((game as unknown as { skillLevel?: number }).skillLevel).toBeUndefined();
      expect(game?.moves).toEqual(['e4', 'e5']);
    });

    it('keeps a record that already carries engineConfig untouched', async () => {
      const newPayload = [
        {
          id: 'new-1',
          date: '2026-04-01T00:00:00.000Z',
          lastPlayed: '2026-04-02T00:00:00.000Z',
          moves: [],
          playerColor: 'black',
          engineConfig: { kind: 'maia', rating: 1800 },
          status: 'in_progress',
        },
      ];
      localStorage.setItem('blindfold_chess_games', JSON.stringify(newPayload));

      const fresh = new LocalStorageGameRepository();
      const game = await fresh.load('new-1');

      expect(game?.engineConfig).toEqual({ kind: 'maia', rating: 1800 });
    });

    it('rejects records that have neither skillLevel nor engineConfig', async () => {
      const malformed = [
        {
          id: 'broken-1',
          date: '2025-01-01T00:00:00.000Z',
          moves: [],
          playerColor: 'white',
          status: 'in_progress',
          // Neither skillLevel nor engineConfig present.
        },
      ];
      localStorage.setItem('blindfold_chess_games', JSON.stringify(malformed));

      const fresh = new LocalStorageGameRepository();
      const games = await fresh.loadAll();
      expect(games).toEqual([]);
    });

    describe('boardVisibility migration', () => {
      it('migrates legacy `gamePreferences.showBoardButtonInGame: true` → `boardVisibility: "peek"`', async () => {
        const legacyPayload = [
          {
            id: 'pref-legacy-true',
            date: '2025-06-01T00:00:00.000Z',
            moves: [],
            playerColor: 'white',
            engineConfig: { kind: 'stockfish', skillLevel: 5 },
            status: 'in_progress',
            gamePreferences: {
              showBoardButtonInGame: true,
              highlightLastMove: true,
              showOwnPieces: true,
              showOpponentPieces: true,
              pieceShapeMode: 'normal',
              pieceColors: 'normal',
              peekMode: 'modal',
            },
          },
        ];
        localStorage.setItem('blindfold_chess_games', JSON.stringify(legacyPayload));

        const fresh = new LocalStorageGameRepository();
        const game = await fresh.load('pref-legacy-true');

        expect(game?.gamePreferences?.boardVisibility).toBe('peek');
        // Legacy field is stripped from the in-app shape.
        expect(
          (game?.gamePreferences as unknown as { showBoardButtonInGame?: boolean })
            ?.showBoardButtonInGame
        ).toBeUndefined();
      });

      it('migrates legacy `gamePreferences.showBoardButtonInGame: false` → `boardVisibility: "never"`', async () => {
        const legacyPayload = [
          {
            id: 'pref-legacy-false',
            date: '2025-06-01T00:00:00.000Z',
            moves: [],
            playerColor: 'white',
            engineConfig: { kind: 'stockfish', skillLevel: 5 },
            status: 'in_progress',
            gamePreferences: {
              showBoardButtonInGame: false,
              highlightLastMove: true,
              showOwnPieces: true,
              showOpponentPieces: true,
              pieceShapeMode: 'normal',
              pieceColors: 'normal',
              peekMode: 'modal',
            },
          },
        ];
        localStorage.setItem('blindfold_chess_games', JSON.stringify(legacyPayload));

        const fresh = new LocalStorageGameRepository();
        const game = await fresh.load('pref-legacy-false');

        expect(game?.gamePreferences?.boardVisibility).toBe('never');
      });

      it('keeps a record that already carries `boardVisibility` untouched', async () => {
        const newPayload = [
          {
            id: 'pref-new',
            date: '2026-05-01T00:00:00.000Z',
            moves: [],
            playerColor: 'white',
            engineConfig: { kind: 'stockfish', skillLevel: 5 },
            status: 'in_progress',
            gamePreferences: {
              boardVisibility: 'always',
              highlightLastMove: true,
              showOwnPieces: true,
              showOpponentPieces: true,
              pieceShapeMode: 'normal',
              pieceColors: 'normal',
              peekMode: 'modal',
            },
          },
        ];
        localStorage.setItem('blindfold_chess_games', JSON.stringify(newPayload));

        const fresh = new LocalStorageGameRepository();
        const game = await fresh.load('pref-new');

        expect(game?.gamePreferences?.boardVisibility).toBe('always');
      });

      it('fills missing peekMode / moveInputMode with defaults when legacy showBoardButtonInGame is migrated', async () => {
        // Pre-Phase-2 record: only the legacy boolean and the booleans that
        // existed at the time. `peekMode` / `moveInputMode` did not exist yet.
        // After migration the loaded game must have valid values for every
        // current per-game key — otherwise the next mid-game settings edit
        // would produce `from: undefined` and the saved game would be dropped
        // from `loadAll()` on the load after that.
        const legacyPayload = [
          {
            id: 'pref-missing-new-fields',
            date: '2025-05-01T00:00:00.000Z',
            moves: [],
            playerColor: 'white',
            engineConfig: { kind: 'stockfish', skillLevel: 5 },
            status: 'in_progress',
            gamePreferences: {
              showBoardButtonInGame: true,
              highlightLastMove: true,
              showOwnPieces: true,
              showOpponentPieces: true,
              pieceShapeMode: 'normal',
              pieceColors: 'normal',
            },
          },
        ];
        localStorage.setItem('blindfold_chess_games', JSON.stringify(legacyPayload));

        const fresh = new LocalStorageGameRepository();
        const game = await fresh.load('pref-missing-new-fields');

        expect(game?.gamePreferences).toMatchObject({
          boardVisibility: 'peek',
          highlightLastMove: true,
          showOwnPieces: true,
          showOpponentPieces: true,
          pieceShapeMode: 'normal',
          pieceColors: 'normal',
          peekMode: 'modal',
          moveInputMode: 'text',
        });
      });

      it('fills missing peekMode / moveInputMode with defaults when the record already carries boardVisibility', async () => {
        // Hypothetical intermediate-shape record that has the new
        // boardVisibility but predates peekMode / moveInputMode — defensive
        // coverage so partial-write paths don't drop a saved game later.
        const payload = [
          {
            id: 'pref-partial',
            date: '2026-01-01T00:00:00.000Z',
            moves: [],
            playerColor: 'white',
            engineConfig: { kind: 'stockfish', skillLevel: 5 },
            status: 'in_progress',
            gamePreferences: {
              boardVisibility: 'always',
              highlightLastMove: true,
              showOwnPieces: true,
              showOpponentPieces: true,
              pieceShapeMode: 'normal',
              pieceColors: 'normal',
            },
          },
        ];
        localStorage.setItem('blindfold_chess_games', JSON.stringify(payload));

        const fresh = new LocalStorageGameRepository();
        const game = await fresh.load('pref-partial');

        expect(game?.gamePreferences?.boardVisibility).toBe('always');
        expect(game?.gamePreferences?.peekMode).toBe('modal');
        expect(game?.gamePreferences?.moveInputMode).toBe('text');
      });

      it('round-trips a migrated legacy record after a new preferenceChangeLog entry is appended (no save-loss regression)', async () => {
        // Reproduces the blocker-1 saved-game-loss scenario end-to-end:
        // a legacy record loads with normalised (now-complete) preferences,
        // the user edits a previously-missing field mid-game, the update is
        // persisted, and the record loads again on the next session. Pre-fix
        // the update would store `from: undefined` in the change log and the
        // record would silently disappear from `loadAll()`.
        const legacyPayload = [
          {
            id: 'pref-roundtrip',
            date: '2025-05-01T00:00:00.000Z',
            moves: [],
            playerColor: 'white',
            engineConfig: { kind: 'stockfish', skillLevel: 5 },
            status: 'in_progress',
            gamePreferences: {
              showBoardButtonInGame: true,
              highlightLastMove: true,
              showOwnPieces: true,
              showOpponentPieces: true,
              pieceShapeMode: 'normal',
              pieceColors: 'normal',
            },
          },
        ];
        localStorage.setItem('blindfold_chess_games', JSON.stringify(legacyPayload));

        const repo = new LocalStorageGameRepository();
        const game = await repo.load('pref-roundtrip');
        expect(game).not.toBeNull();
        // The mid-game edit: change moveInputMode (a field absent from the
        // legacy snapshot). After normalisation the snapshot has
        // `moveInputMode: 'text'`, so the entry has a valid `from` value.
        await repo.update('pref-roundtrip', {
          moves: game!.moves,
          playerColor: game!.playerColor,
          engineConfig: game!.engineConfig,
          status: game!.status,
          startingFen: game!.startingFen,
          gamePreferences: game!.gamePreferences,
          preferenceChangeLog: [
            { atMoveIndex: 0, key: 'moveInputMode', from: 'text', to: 'button' },
          ],
          operationLogs: game!.operationLogs,
        });

        const reloaded = new LocalStorageGameRepository();
        const after = await reloaded.load('pref-roundtrip');
        // Must still be loadable — pre-fix this returned null because the
        // entry-validation step would have rejected `from: undefined`.
        expect(after).not.toBeNull();
        expect(after?.preferenceChangeLog).toEqual([
          { atMoveIndex: 0, key: 'moveInputMode', from: 'text', to: 'button' },
        ]);
      });

      it('prefers the new `boardVisibility` field when both are present (idempotent on records written by upgraded code)', async () => {
        const mixedPayload = [
          {
            id: 'pref-mixed',
            date: '2026-05-15T00:00:00.000Z',
            moves: [],
            playerColor: 'white',
            engineConfig: { kind: 'stockfish', skillLevel: 5 },
            status: 'in_progress',
            gamePreferences: {
              // Both present — would only occur if data was hand-edited.
              // New field wins for forward-compat reasons.
              boardVisibility: 'always',
              showBoardButtonInGame: false,
              highlightLastMove: true,
              showOwnPieces: true,
              showOpponentPieces: true,
              pieceShapeMode: 'normal',
              pieceColors: 'normal',
              peekMode: 'modal',
            },
          },
        ];
        localStorage.setItem('blindfold_chess_games', JSON.stringify(mixedPayload));

        const fresh = new LocalStorageGameRepository();
        const game = await fresh.load('pref-mixed');

        expect(game?.gamePreferences?.boardVisibility).toBe('always');
      });
    });

    describe('preferenceChangeLog migration', () => {
      it('migrates a legacy showBoardButtonInGame entry into a boardVisibility entry', async () => {
        const legacyPayload = [
          {
            id: 'log-legacy',
            date: '2025-08-01T00:00:00.000Z',
            moves: [],
            playerColor: 'white',
            engineConfig: { kind: 'stockfish', skillLevel: 5 },
            status: 'in_progress',
            preferenceChangeLog: [
              { atMoveIndex: 3, key: 'showBoardButtonInGame', from: true, to: false },
            ],
          },
        ];
        localStorage.setItem('blindfold_chess_games', JSON.stringify(legacyPayload));

        const fresh = new LocalStorageGameRepository();
        const game = await fresh.load('log-legacy');

        expect(game?.preferenceChangeLog).toEqual([
          { atMoveIndex: 3, key: 'boardVisibility', from: 'peek', to: 'never' },
        ]);
      });

      it('leaves non-showBoardButtonInGame entries untouched', async () => {
        const payload = [
          {
            id: 'log-mixed',
            date: '2025-08-01T00:00:00.000Z',
            moves: [],
            playerColor: 'white',
            engineConfig: { kind: 'stockfish', skillLevel: 5 },
            status: 'in_progress',
            preferenceChangeLog: [
              { atMoveIndex: 1, key: 'showBoardButtonInGame', from: false, to: true },
              { atMoveIndex: 5, key: 'pieceColors', from: 'normal', to: 'white-only' },
              { atMoveIndex: 9, key: 'peekMode', from: 'modal', to: 'inline' },
            ],
          },
        ];
        localStorage.setItem('blindfold_chess_games', JSON.stringify(payload));

        const fresh = new LocalStorageGameRepository();
        const game = await fresh.load('log-mixed');

        expect(game?.preferenceChangeLog).toEqual([
          // First entry migrated; others unchanged.
          { atMoveIndex: 1, key: 'boardVisibility', from: 'never', to: 'peek' },
          { atMoveIndex: 5, key: 'pieceColors', from: 'normal', to: 'white-only' },
          { atMoveIndex: 9, key: 'peekMode', from: 'modal', to: 'inline' },
        ]);
      });

      it('accepts a new-shape boardVisibility entry as-is', async () => {
        const payload = [
          {
            id: 'log-new',
            date: '2026-05-01T00:00:00.000Z',
            moves: [],
            playerColor: 'white',
            engineConfig: { kind: 'stockfish', skillLevel: 5 },
            status: 'in_progress',
            preferenceChangeLog: [
              { atMoveIndex: 4, key: 'boardVisibility', from: 'peek', to: 'always' },
            ],
          },
        ];
        localStorage.setItem('blindfold_chess_games', JSON.stringify(payload));

        const fresh = new LocalStorageGameRepository();
        const game = await fresh.load('log-new');

        expect(game?.preferenceChangeLog).toEqual([
          { atMoveIndex: 4, key: 'boardVisibility', from: 'peek', to: 'always' },
        ]);
      });
    });
  });
});
