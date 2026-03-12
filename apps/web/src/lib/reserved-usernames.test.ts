import { describe, expect, it } from 'vitest';

import { isReservedUsername } from './reserved-usernames';

describe('isReservedUsername', () => {
  describe('Category 1: RFC 2142 role-based addresses', () => {
    it.each(['postmaster', 'hostmaster', 'webmaster', 'abuse', 'noreply', 'security', 'root'])(
      'blocks RFC 2142 role name "%s"',
      (name) => {
        expect(isReservedUsername(name)).toBe(true);
      }
    );
  });

  describe('Category 2: URL routing collision prevention', () => {
    it.each(['api', 'auth', 'practice', 'games', 'profile', 'settings', 'login', 'logout'])(
      'blocks application route "%s"',
      (name) => {
        expect(isReservedUsername(name)).toBe(true);
      }
    );
  });

  describe('Category 3: Impersonation prevention', () => {
    it.each(['admin', 'administrator', 'moderator', 'mod', 'staff', 'system', 'bot', 'owner'])(
      'blocks impersonation name "%s"',
      (name) => {
        expect(isReservedUsername(name)).toBe(true);
      }
    );
  });

  describe('Category 4: Brand, platform, and geopolitical names', () => {
    it.each([
      'github',
      'google',
      'discord',
      'chess_com',
      'lichess',
      'english',
      'japanese',
      'us',
      'jp',
    ])('blocks brand/geo name "%s"', (name) => {
      expect(isReservedUsername(name)).toBe(true);
    });
  });

  describe('Category 5: Chess domain-specific terms', () => {
    it.each([
      'chess',
      'blindfold',
      'checkmate',
      'grandmaster',
      'stockfish',
      'king',
      'queen',
      'pawn',
    ])('blocks chess term "%s"', (name) => {
      expect(isReservedUsername(name)).toBe(true);
    });
  });

  describe('Category 6: Testing, development, and operational names', () => {
    it.each(['test', 'testing', 'demo', 'dev', 'staging', 'production', 'sandbox', 'localhost'])(
      'blocks testing/dev name "%s"',
      (name) => {
        expect(isReservedUsername(name)).toBe(true);
      }
    );
  });

  describe('Category 7: Generic and placeholder names', () => {
    it.each(['user', 'anonymous', 'anon', 'guest', 'unknown', 'null', 'undefined'])(
      'blocks generic/placeholder name "%s"',
      (name) => {
        expect(isReservedUsername(name)).toBe(true);
      }
    );
  });

  describe('non-reserved usernames', () => {
    it.each(['alice', 'bob123', 'player_one', 'test_user_123', 'john', 'myapp', 'coolplayer'])(
      'allows normal username "%s"',
      (name) => {
        expect(isReservedUsername(name)).toBe(false);
      }
    );
  });

  describe('similar but non-matching names (exact match only)', () => {
    it.each([
      'admin123',
      'myadmin',
      'admins',
      'superadmin',
      'chess99',
      'thequeen',
      'kings',
      'rooter',
      'apikey',
      'login2',
      'supportme',
    ])('allows similar-to-reserved name "%s"', (name) => {
      expect(isReservedUsername(name)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns false for empty string', () => {
      expect(isReservedUsername('')).toBe(false);
    });

    it('returns false for a single character', () => {
      expect(isReservedUsername('a')).toBe(false);
    });

    it('blocks two-letter country codes that are reserved', () => {
      expect(isReservedUsername('us')).toBe(true);
      expect(isReservedUsername('uk')).toBe(true);
      expect(isReservedUsername('jp')).toBe(true);
      expect(isReservedUsername('de')).toBe(true);
    });

    it('allows two-letter strings that are not reserved', () => {
      expect(isReservedUsername('ab')).toBe(false);
      expect(isReservedUsername('zz')).toBe(false);
      expect(isReservedUsername('xy')).toBe(false);
    });
  });
});
