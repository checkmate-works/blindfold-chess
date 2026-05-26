import { describe, expect, it } from 'vitest';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { DEFAULT_PER_GAME_PREFERENCES, normalisePerGamePreferences } from './per-game-preferences';

describe('normalisePerGamePreferences', () => {
  describe('null / undefined / non-object input', () => {
    it('returns undefined for undefined', () => {
      expect(normalisePerGamePreferences(undefined)).toBeUndefined();
    });

    it('returns undefined for null', () => {
      expect(normalisePerGamePreferences(null)).toBeUndefined();
    });

    it('returns a copy of defaults for a non-object value', () => {
      expect(normalisePerGamePreferences('not-an-object')).toEqual(DEFAULT_PER_GAME_PREFERENCES);
      expect(normalisePerGamePreferences(42)).toEqual(DEFAULT_PER_GAME_PREFERENCES);
    });
  });

  describe('legacy showBoardButtonInGame migration', () => {
    it('maps showBoardButtonInGame: true to boardVisibility: "peek"', () => {
      const result = normalisePerGamePreferences({ showBoardButtonInGame: true });
      expect(result?.boardVisibility).toBe('peek');
    });

    it('maps showBoardButtonInGame: false to boardVisibility: "never"', () => {
      const result = normalisePerGamePreferences({ showBoardButtonInGame: false });
      expect(result?.boardVisibility).toBe('never');
    });

    it('does not preserve the legacy showBoardButtonInGame key in the returned object', () => {
      const result = normalisePerGamePreferences({ showBoardButtonInGame: true });
      expect(result).toBeDefined();
      expect(Object.keys(result!)).not.toContain('showBoardButtonInGame');
    });

    it('prefers a valid boardVisibility over the legacy boolean when both are present', () => {
      const result = normalisePerGamePreferences({
        boardVisibility: 'always',
        showBoardButtonInGame: false,
      });
      expect(result?.boardVisibility).toBe('always');
    });
  });

  describe('boardVisibility', () => {
    it('keeps valid existing boardVisibility', () => {
      for (const v of ['always', 'peek', 'never'] as const) {
        expect(normalisePerGamePreferences({ boardVisibility: v })?.boardVisibility).toBe(v);
      }
    });

    it('defaults missing boardVisibility to "peek"', () => {
      const result = normalisePerGamePreferences({});
      expect(result?.boardVisibility).toBe('peek');
    });

    it('defaults invalid boardVisibility to "peek"', () => {
      const result = normalisePerGamePreferences({ boardVisibility: 'sometimes' });
      expect(result?.boardVisibility).toBe('peek');
    });
  });

  describe('peekMode and moveInputMode defaults', () => {
    it('defaults missing peekMode to "modal"', () => {
      const result = normalisePerGamePreferences({});
      expect(result?.peekMode).toBe('modal');
    });

    it('defaults missing moveInputMode to "text"', () => {
      const result = normalisePerGamePreferences({});
      expect(result?.moveInputMode).toBe('text');
    });

    it('defaults invalid peekMode to "modal"', () => {
      const result = normalisePerGamePreferences({ peekMode: 'bogus' });
      expect(result?.peekMode).toBe('modal');
    });

    it('defaults invalid moveInputMode to "text"', () => {
      const result = normalisePerGamePreferences({ moveInputMode: 'voice' });
      expect(result?.moveInputMode).toBe('text');
    });

    it('keeps valid peekMode and moveInputMode values', () => {
      expect(
        normalisePerGamePreferences({ peekMode: 'inline', moveInputMode: 'button' })
      ).toMatchObject({ peekMode: 'inline', moveInputMode: 'button' });
    });
  });

  describe('enum validation for pieceShapeMode / pieceColors', () => {
    it('keeps valid pieceShapeMode values', () => {
      for (const v of ['normal', 'circles-all', 'circles-own', 'circles-opponent'] as const) {
        expect(normalisePerGamePreferences({ pieceShapeMode: v })?.pieceShapeMode).toBe(v);
      }
    });

    it('rejects invalid pieceShapeMode and falls back to default', () => {
      expect(normalisePerGamePreferences({ pieceShapeMode: 'squares' })?.pieceShapeMode).toBe(
        'normal'
      );
    });

    it('keeps valid pieceColors values', () => {
      for (const v of ['normal', 'white-only', 'black-only'] as const) {
        expect(normalisePerGamePreferences({ pieceColors: v })?.pieceColors).toBe(v);
      }
    });

    it('rejects invalid pieceColors and falls back to default', () => {
      expect(normalisePerGamePreferences({ pieceColors: 'rainbow' })?.pieceColors).toBe('normal');
    });
  });

  describe('boolean validation', () => {
    it('keeps valid boolean values', () => {
      const result = normalisePerGamePreferences({
        highlightLastMove: false,
        showOwnPieces: false,
        showOpponentPieces: false,
      });
      expect(result).toMatchObject({
        highlightLastMove: false,
        showOwnPieces: false,
        showOpponentPieces: false,
      });
    });

    it('rejects non-boolean values and falls back to default', () => {
      const result = normalisePerGamePreferences({
        highlightLastMove: 'yes',
        showOwnPieces: 1,
        showOpponentPieces: null,
      });
      expect(result).toMatchObject({
        highlightLastMove: true,
        showOwnPieces: true,
        showOpponentPieces: true,
      });
    });
  });

  describe('completeness', () => {
    it('returns an object containing every PerGamePreferences key, given an empty object', () => {
      const result = normalisePerGamePreferences({});
      const expectedKeys: ReadonlyArray<keyof PerGamePreferences> = [
        'boardVisibility',
        'highlightLastMove',
        'showOwnPieces',
        'showOpponentPieces',
        'pieceShapeMode',
        'pieceColors',
        'peekMode',
        'moveInputMode',
      ];
      for (const k of expectedKeys) {
        expect(result).toHaveProperty(k);
      }
    });

    it('does not include any extra unknown keys on the returned object', () => {
      const result = normalisePerGamePreferences({
        bogus: 'value',
        showBoardButtonInGame: true,
      });
      expect(Object.keys(result!).sort()).toEqual(
        [
          'boardVisibility',
          'highlightLastMove',
          'moveInputMode',
          'peekMode',
          'pieceColors',
          'pieceShapeMode',
          'showOpponentPieces',
          'showOwnPieces',
        ].sort()
      );
    });
  });

  describe('custom defaults', () => {
    it('uses caller-provided defaults to fill missing fields', () => {
      const customDefaults: PerGamePreferences = {
        boardVisibility: 'always',
        highlightLastMove: false,
        showOwnPieces: false,
        showOpponentPieces: false,
        pieceShapeMode: 'circles-all',
        pieceColors: 'white-only',
        peekMode: 'inline',
        moveInputMode: 'button',
      };
      const result = normalisePerGamePreferences({}, customDefaults);
      expect(result).toEqual(customDefaults);
    });
  });
});
