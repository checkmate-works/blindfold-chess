import { describe, expect, it } from 'vitest';

import { parseUrlSearchParams } from './use-game-initialization';

describe('parseUrlSearchParams', () => {
  describe('color parameter', () => {
    it('should default to white when no color is specified', () => {
      const params = new URLSearchParams();
      const result = parseUrlSearchParams(params);
      expect(result.playerSide).toBe('white');
    });

    it('should parse color=white', () => {
      const params = new URLSearchParams({ color: 'white' });
      const result = parseUrlSearchParams(params);
      expect(result.playerSide).toBe('white');
    });

    it('should parse color=black', () => {
      const params = new URLSearchParams({ color: 'black' });
      const result = parseUrlSearchParams(params);
      expect(result.playerSide).toBe('black');
    });

    it('should fall back to white for empty color parameter', () => {
      const params = new URLSearchParams({ color: '' });
      const result = parseUrlSearchParams(params);
      expect(result.playerSide).toBe('white');
    });
  });

  describe('skillLevel parameter', () => {
    it('should default to 5 when no skillLevel is specified', () => {
      const params = new URLSearchParams();
      const result = parseUrlSearchParams(params);
      expect(result.skillLevel).toBe(5);
    });

    it('should parse valid skill levels', () => {
      const params = new URLSearchParams({ skillLevel: '10' });
      const result = parseUrlSearchParams(params);
      expect(result.skillLevel).toBe(10);
    });

    it('should parse skillLevel=1', () => {
      const params = new URLSearchParams({ skillLevel: '1' });
      const result = parseUrlSearchParams(params);
      expect(result.skillLevel).toBe(1);
    });

    it('should parse skillLevel=20', () => {
      const params = new URLSearchParams({ skillLevel: '20' });
      const result = parseUrlSearchParams(params);
      expect(result.skillLevel).toBe(20);
    });
  });

  describe('gameId parameter', () => {
    it('should return undefined when no gameId is specified', () => {
      const params = new URLSearchParams();
      const result = parseUrlSearchParams(params);
      expect(result.gameId).toBeUndefined();
    });

    it('should parse gameId', () => {
      const params = new URLSearchParams({ gameId: 'abc-123' });
      const result = parseUrlSearchParams(params);
      expect(result.gameId).toBe('abc-123');
    });

    it('should return undefined for empty gameId', () => {
      const params = new URLSearchParams({ gameId: '' });
      const result = parseUrlSearchParams(params);
      expect(result.gameId).toBeUndefined();
    });
  });

  describe('fen parameter', () => {
    it('should return undefined when no fen is specified', () => {
      const params = new URLSearchParams();
      const result = parseUrlSearchParams(params);
      expect(result.startingFen).toBeUndefined();
    });

    it('should parse a custom FEN', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      const params = new URLSearchParams({ fen });
      const result = parseUrlSearchParams(params);
      expect(result.startingFen).toBe(fen);
    });

    it('should return undefined for empty fen', () => {
      const params = new URLSearchParams({ fen: '' });
      const result = parseUrlSearchParams(params);
      expect(result.startingFen).toBeUndefined();
    });
  });

  describe('moves parameter', () => {
    it('should return null when no moves are specified', () => {
      const params = new URLSearchParams();
      const result = parseUrlSearchParams(params);
      expect(result.urlMoves).toBeNull();
    });

    it('should return the raw moves string', () => {
      const moves = JSON.stringify(['e4', 'e5', 'Nf3']);
      const params = new URLSearchParams({ moves });
      const result = parseUrlSearchParams(params);
      expect(result.urlMoves).toBe(moves);
    });
  });

  describe('combined parameters (opening page integration)', () => {
    it('should correctly parse params for a white opening from openings page', () => {
      // Simulates navigating from an opening page for a white opening (e.g., Sicilian: 1.e4 c5)
      const params = new URLSearchParams({
        color: 'white',
        moves: JSON.stringify(['e4', 'c5']),
      });
      const result = parseUrlSearchParams(params);
      expect(result.playerSide).toBe('white');
      expect(result.urlMoves).toBe(JSON.stringify(['e4', 'c5']));
    });

    it('should correctly parse params for a black opening from openings page', () => {
      // Simulates navigating from an opening page for a black opening (e.g., after 1.e4 e5)
      const params = new URLSearchParams({
        color: 'black',
        moves: JSON.stringify(['e4', 'e5']),
      });
      const result = parseUrlSearchParams(params);
      expect(result.playerSide).toBe('black');
      expect(result.urlMoves).toBe(JSON.stringify(['e4', 'e5']));
    });

    it('should handle full game start params with color and skillLevel', () => {
      const params = new URLSearchParams({
        color: 'black',
        skillLevel: '15',
        moves: JSON.stringify(['e4', 'e5', 'Nf3', 'Nc6']),
      });
      const result = parseUrlSearchParams(params);
      expect(result.playerSide).toBe('black');
      expect(result.skillLevel).toBe(15);
      expect(result.urlMoves).toBe(JSON.stringify(['e4', 'e5', 'Nf3', 'Nc6']));
    });
  });

  describe('gamePrefs parameter', () => {
    it('should return undefined when no gamePrefs is specified', () => {
      const params = new URLSearchParams();
      const result = parseUrlSearchParams(params);
      expect(result.gamePrefs).toBeUndefined();
    });

    it('should parse valid JSON gamePrefs', () => {
      const prefs = { showBoard: true };
      const params = new URLSearchParams({ gamePrefs: JSON.stringify(prefs) });
      const result = parseUrlSearchParams(params);
      expect(result.gamePrefs).toEqual(prefs);
    });

    it('should return undefined for invalid JSON gamePrefs', () => {
      const params = new URLSearchParams({ gamePrefs: 'not-json' });
      const result = parseUrlSearchParams(params);
      expect(result.gamePrefs).toBeUndefined();
    });
  });
});
