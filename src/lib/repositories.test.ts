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
    it('should allow saving games up to the limit', async () => {
      // Save games up to MAX_GAMES
      for (let i = 0; i < MAX_GAMES; i++) {
        const gameId = await repository.save({
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
      // Save games up to MAX_GAMES
      for (let i = 0; i < MAX_GAMES; i++) {
        await repository.save({
          moves: [],
          playerColor: 'white',
          skillLevel: 5,
          status: 'in_progress',
        });
      }

      // Attempt to save one more game
      await expect(
        repository.save({
          moves: [],
          playerColor: 'black',
          skillLevel: 10,
          status: 'in_progress',
        })
      ).rejects.toThrow(GameLimitError);
    });

    it('should throw GameLimitError when creating a new game with non-existent ID beyond the limit', async () => {
      // Save games up to MAX_GAMES
      for (let i = 0; i < MAX_GAMES; i++) {
        await repository.save({
          moves: [],
          playerColor: 'white',
          skillLevel: 5,
          status: 'in_progress',
        });
      }

      // Attempt to save a game with a non-existent ID (simulating shared link)
      const nonExistentId = 'non-existent-id-12345';
      await expect(
        repository.save(
          {
            moves: ['e4'],
            playerColor: 'black',
            skillLevel: 10,
            status: 'in_progress',
          },
          nonExistentId
        )
      ).rejects.toThrow(GameLimitError);
    });

    it('should allow updating an existing game even when at the limit', async () => {
      // Save games up to MAX_GAMES
      const gameIds: string[] = [];
      for (let i = 0; i < MAX_GAMES; i++) {
        const gameId = await repository.save({
          moves: [],
          playerColor: 'white',
          skillLevel: 5,
          status: 'in_progress',
        });
        gameIds.push(gameId);
      }

      // Update an existing game - should succeed
      const updatedGameId = await repository.save(
        {
          moves: ['e4', 'e5'],
          playerColor: 'white',
          skillLevel: 5,
          status: 'in_progress',
        },
        gameIds[0]
      );

      expect(updatedGameId).toBe(gameIds[0]);

      // Verify the game was updated
      const game = await repository.load(gameIds[0]);
      expect(game?.moves).toEqual(['e4', 'e5']);

      // Verify total count is still MAX_GAMES
      const games = await repository.loadAll();
      expect(games.length).toBe(MAX_GAMES);
    });

    it('should include correct error message with limit value', async () => {
      // Save games up to MAX_GAMES
      for (let i = 0; i < MAX_GAMES; i++) {
        await repository.save({
          moves: [],
          playerColor: 'white',
          skillLevel: 5,
          status: 'in_progress',
        });
      }

      // Attempt to save one more game and check error message
      try {
        await repository.save({
          moves: [],
          playerColor: 'black',
          skillLevel: 10,
          status: 'in_progress',
        });
        expect.fail('Should have thrown GameLimitError');
      } catch (error) {
        expect(error).toBeInstanceOf(GameLimitError);
        expect(error.message).toContain(`${MAX_GAMES}`);
      }
    });
  });
});
