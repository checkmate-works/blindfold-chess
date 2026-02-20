import { MAX_GAMES } from '@/config';
import { beforeEach, describe, expect, it } from 'vitest';

import { GameLimitError } from './errors';
import { LocalStorageGameRepository } from './repositories';

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
          skillLevel: 5,
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
          skillLevel: 5,
          status: 'in_progress',
        });
      }

      await expect(
        repository.create({
          moves: [],
          playerColor: 'black',
          skillLevel: 10,
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
          skillLevel: 5,
          status: 'in_progress',
        });
        gameIds.push(gameId);
      }

      await repository.update(gameIds[0], {
        moves: ['e4', 'e5'],
        playerColor: 'white',
        skillLevel: 5,
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
          skillLevel: 5,
          status: 'in_progress',
        });
      }

      try {
        await repository.create({
          moves: [],
          playerColor: 'black',
          skillLevel: 10,
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
        skillLevel: 10,
        status: 'in_progress',
      });

      expect(gameId).toBeDefined();
      expect(typeof gameId).toBe('string');

      const game = await repository.load(gameId);
      expect(game).toBeDefined();
      expect(game?.moves).toEqual(['e4']);
      expect(game?.playerColor).toBe('white');
      expect(game?.skillLevel).toBe(10);
      expect(game?.status).toBe('in_progress');
    });

    it('should generate a unique UUID for each game', async () => {
      const gameId1 = await repository.create({
        moves: [],
        playerColor: 'white',
        skillLevel: 5,
        status: 'in_progress',
      });

      const gameId2 = await repository.create({
        moves: [],
        playerColor: 'black',
        skillLevel: 5,
        status: 'in_progress',
      });

      expect(gameId1).not.toBe(gameId2);
    });

    it('should set date and lastPlayed to current time', async () => {
      const beforeCreate = new Date().toISOString();
      const gameId = await repository.create({
        moves: [],
        playerColor: 'white',
        skillLevel: 5,
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
          skillLevel: 5,
          status: 'in_progress',
        });
      }

      // Attempt to create one more
      await expect(
        repository.create({
          moves: [],
          playerColor: 'black',
          skillLevel: 10,
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
        skillLevel: 5,
        status: 'in_progress',
      });

      await repository.update(gameId, {
        moves: ['e4', 'e5', 'Nf3'],
        playerColor: 'white',
        skillLevel: 5,
        status: 'in_progress',
      });

      const game = await repository.load(gameId);
      expect(game?.moves).toEqual(['e4', 'e5', 'Nf3']);
    });

    it('should preserve the creation date', async () => {
      const gameId = await repository.create({
        moves: [],
        playerColor: 'white',
        skillLevel: 5,
        status: 'in_progress',
      });

      const originalGame = await repository.load(gameId);
      const originalDate = originalGame!.date;

      // Wait a bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await repository.update(gameId, {
        moves: ['e4'],
        playerColor: 'white',
        skillLevel: 5,
        status: 'in_progress',
      });

      const updatedGame = await repository.load(gameId);
      expect(updatedGame?.date).toBe(originalDate);
    });

    it('should update lastPlayed timestamp', async () => {
      const gameId = await repository.create({
        moves: [],
        playerColor: 'white',
        skillLevel: 5,
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
        skillLevel: 5,
        status: 'in_progress',
      });

      const updatedGame = await repository.load(gameId);
      expect(updatedGame).toBeDefined();
      expect(updatedGame!.lastPlayed).toBeDefined();
      expect(updatedGame!.lastPlayed).not.toBe(originalLastPlayed);
      expect(updatedGame!.lastPlayed! > originalLastPlayed).toBe(true);
    });

    it('should throw error when game does not exist', async () => {
      const nonExistentId = 'non-existent-id-12345';

      await expect(
        repository.update(nonExistentId, {
          moves: ['e4'],
          playerColor: 'white',
          skillLevel: 5,
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
          skillLevel: 5,
          status: 'in_progress',
        });
        gameIds.push(gameId);
      }

      // Update should succeed even at limit
      await repository.update(gameIds[0], {
        moves: ['e4', 'e5'],
        playerColor: 'white',
        skillLevel: 5,
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
        skillLevel: 5,
        status: 'in_progress',
      });

      await repository.update(gameId, {
        moves: ['e4'],
        playerColor: 'white',
        skillLevel: 15,
        status: 'in_progress',
      });

      const game = await repository.load(gameId);
      expect(game?.skillLevel).toBe(15);
    });

    it('should update game status correctly', async () => {
      const gameId = await repository.create({
        moves: ['e4', 'e5'],
        playerColor: 'white',
        skillLevel: 5,
        status: 'in_progress',
      });

      await repository.update(gameId, {
        moves: ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#'],
        playerColor: 'white',
        skillLevel: 5,
        status: 'win',
      });

      const game = await repository.load(gameId);
      expect(game?.status).toBe('win');
    });
  });
});
