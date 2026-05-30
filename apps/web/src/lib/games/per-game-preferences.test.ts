import { describe, expect, it } from 'vitest';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { PeekPreferenceHint } from './peek-cookie';
import {
  DEFAULT_PER_GAME_PREFERENCES,
  normalisePerGamePreferences,
  peekHintFromGamePrefsParam,
} from './per-game-preferences';

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

describe('peekHintFromGamePrefsParam', () => {
  // Cookie-sourced fallback used across the cases — deliberately differs from
  // the values encoded in the `gamePrefs` params below so a passthrough vs.
  // override is unambiguous.
  const COOKIE_FALLBACK: PeekPreferenceHint = { peekMode: 'modal', boardVisibility: 'never' };

  it('returns the fallback when the param is absent', () => {
    expect(peekHintFromGamePrefsParam(undefined, COOKIE_FALLBACK)).toEqual(COOKIE_FALLBACK);
    expect(peekHintFromGamePrefsParam(null, COOKIE_FALLBACK)).toEqual(COOKIE_FALLBACK);
    expect(peekHintFromGamePrefsParam('', COOKIE_FALLBACK)).toEqual(COOKIE_FALLBACK);
  });

  it('returns the fallback when the param is not valid JSON', () => {
    expect(peekHintFromGamePrefsParam('{not json', COOKIE_FALLBACK)).toEqual(COOKIE_FALLBACK);
  });

  it("derives the hint from the game's own boardVisibility / peekMode", () => {
    const param = JSON.stringify({ boardVisibility: 'always', peekMode: 'inline' });
    expect(peekHintFromGamePrefsParam(param, COOKIE_FALLBACK)).toEqual({
      peekMode: 'inline',
      boardVisibility: 'always',
    });
  });

  it('overrides the fallback even when the game opts into a less-visible mode', () => {
    // A game saved as peek+inline must NOT be masked by a cookie that says
    // always — the param is authoritative for the fields it carries.
    const param = JSON.stringify({ boardVisibility: 'peek', peekMode: 'inline' });
    const fallback: PeekPreferenceHint = { peekMode: 'modal', boardVisibility: 'always' };
    expect(peekHintFromGamePrefsParam(param, fallback)).toEqual({
      peekMode: 'inline',
      boardVisibility: 'peek',
    });
  });

  it('falls back per-field for keys missing from the param', () => {
    // Only boardVisibility present → peekMode falls back to the cookie value,
    // not the hard DEFAULT_PER_GAME_PREFERENCES.
    const param = JSON.stringify({ boardVisibility: 'always' });
    const fallback: PeekPreferenceHint = { peekMode: 'inline', boardVisibility: 'never' };
    expect(peekHintFromGamePrefsParam(param, fallback)).toEqual({
      peekMode: 'inline',
      boardVisibility: 'always',
    });
  });

  it('falls back for invalid enum values in the param', () => {
    const param = JSON.stringify({ boardVisibility: 'bogus', peekMode: 'nope' });
    expect(peekHintFromGamePrefsParam(param, COOKIE_FALLBACK)).toEqual(COOKIE_FALLBACK);
  });
});
