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

  describe('engineConfig parameter', () => {
    it('defaults to Stockfish level 5 when no params are specified', () => {
      const params = new URLSearchParams();
      const result = parseUrlSearchParams(params);
      expect(result.engineConfig).toEqual({ kind: 'stockfish', skillLevel: 5 });
    });

    it('parses ?skillLevel=10 as Stockfish at that level', () => {
      const params = new URLSearchParams({ skillLevel: '10' });
      const result = parseUrlSearchParams(params);
      expect(result.engineConfig).toEqual({ kind: 'stockfish', skillLevel: 10 });
    });

    it('parses ?engine=maia&elo=1800 as Maia at that rating', () => {
      const params = new URLSearchParams({ engine: 'maia', elo: '1800' });
      const result = parseUrlSearchParams(params);
      expect(result.engineConfig).toEqual({ kind: 'maia', rating: 1800 });
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
      expect(result.engineConfig).toEqual({ kind: 'stockfish', skillLevel: 15 });
      expect(result.urlMoves).toBe(JSON.stringify(['e4', 'e5', 'Nf3', 'Nc6']));
    });
  });

  describe('gamePrefs parameter', () => {
    it('should return undefined when no gamePrefs is specified', () => {
      const params = new URLSearchParams();
      const result = parseUrlSearchParams(params);
      expect(result.gamePrefs).toBeUndefined();
    });

    it('should parse and normalize valid JSON gamePrefs into a complete PerGamePreferences', () => {
      // The URL may carry a partial blob (e.g., the new-game form only sets a
      // subset of fields). The parser must round-trip these into a complete
      // object so downstream consumers can rely on every key being present.
      const prefs = {
        boardVisibility: 'always',
        highlightLastMove: false,
        showPieceDestinations: true,
        showOwnPieces: true,
        showOpponentPieces: true,
        pieceShapeMode: 'normal',
        pieceColors: 'normal',
        moveInputMode: 'button',
      };
      const params = new URLSearchParams({ gamePrefs: JSON.stringify(prefs) });
      const result = parseUrlSearchParams(params);
      expect(result.gamePrefs).toEqual(prefs);
    });

    it('should return undefined for invalid JSON gamePrefs', () => {
      const params = new URLSearchParams({ gamePrefs: 'not-json' });
      const result = parseUrlSearchParams(params);
      expect(result.gamePrefs).toBeUndefined();
    });

    it('migrates legacy showBoardButtonInGame: true to boardVisibility: "peek"', () => {
      // Old / stale generated URLs may still carry the pre-Phase-1 boolean.
      // The parser must apply the same mapping as the localStorage repository
      // so a new session started from such a URL behaves like an equivalent
      // current URL.
      const params = new URLSearchParams({
        gamePrefs: JSON.stringify({ showBoardButtonInGame: true }),
      });
      const result = parseUrlSearchParams(params);
      expect(result.gamePrefs?.boardVisibility).toBe('peek');
    });

    it('migrates legacy showBoardButtonInGame: false to boardVisibility: "never"', () => {
      const params = new URLSearchParams({
        gamePrefs: JSON.stringify({ showBoardButtonInGame: false }),
      });
      const result = parseUrlSearchParams(params);
      expect(result.gamePrefs?.boardVisibility).toBe('never');
    });

    it('strips the legacy showBoardButtonInGame key from the parsed object', () => {
      const params = new URLSearchParams({
        gamePrefs: JSON.stringify({ showBoardButtonInGame: true }),
      });
      const result = parseUrlSearchParams(params);
      expect(result.gamePrefs).toBeDefined();
      expect(Object.keys(result.gamePrefs!)).not.toContain('showBoardButtonInGame');
    });

    it('fills missing moveInputMode with defaults', () => {
      const params = new URLSearchParams({
        gamePrefs: JSON.stringify({
          boardVisibility: 'always',
          highlightLastMove: true,
        }),
      });
      const result = parseUrlSearchParams(params);
      expect(result.gamePrefs?.moveInputMode).toBe('text');
    });

    it('rejects invalid enum values and falls back to defaults', () => {
      const params = new URLSearchParams({
        gamePrefs: JSON.stringify({
          boardVisibility: 'sometimes',
          moveInputMode: 'voice',
          pieceColors: 'rainbow',
          pieceShapeMode: 'squares',
        }),
      });
      const result = parseUrlSearchParams(params);
      expect(result.gamePrefs?.boardVisibility).toBe('peek');
      expect(result.gamePrefs?.moveInputMode).toBe('text');
      expect(result.gamePrefs?.pieceColors).toBe('normal');
      expect(result.gamePrefs?.pieceShapeMode).toBe('normal');
    });

    it('does not affect parsing of other URL params (color, engine, fen, moves)', () => {
      const params = new URLSearchParams({
        color: 'black',
        engine: 'maia',
        elo: '1800',
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        moves: JSON.stringify(['e4', 'e5']),
        gamePrefs: JSON.stringify({ showBoardButtonInGame: false }),
      });
      const result = parseUrlSearchParams(params);
      expect(result.playerSide).toBe('black');
      expect(result.engineConfig).toEqual({ kind: 'maia', rating: 1800 });
      expect(result.startingFen).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
      expect(result.urlMoves).toBe(JSON.stringify(['e4', 'e5']));
      expect(result.gamePrefs?.boardVisibility).toBe('never');
    });
  });
});
