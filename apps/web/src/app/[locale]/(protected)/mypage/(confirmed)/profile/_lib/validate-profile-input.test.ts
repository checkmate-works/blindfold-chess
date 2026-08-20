import { describe, expect, it } from 'vitest';

import type { ProfileInput } from './validate-profile-input';
import { validateProfileInput } from './validate-profile-input';

/** No mocks needed: the profanity check is the function's only dependency. */
type ValidateDeps = { isLameName: (name: string) => boolean };
const deps: ValidateDeps = { isLameName: (name) => name === 'badname' };
const noLameNames: ValidateDeps = { isLameName: () => false };

const validate = (input: ProfileInput, d: ValidateDeps = deps) =>
  validateProfileInput({ displayName: 'Valid Name', ...input }, d);

describe('validateProfileInput', () => {
  describe('rejections', () => {
    const cases: [string, ProfileInput, string][] = [
      ['displayName missing', { displayName: undefined }, 'display_name_required'],
      ['displayName whitespace-only', { displayName: '   ' }, 'display_name_required'],
      ['displayName over 50 chars', { displayName: 'a'.repeat(51) }, 'display_name_too_long'],
      ['displayName inappropriate', { displayName: 'badname' }, 'display_name_inappropriate'],
      ['bio over 500 chars', { bio: 'a'.repeat(501) }, 'bio_too_long'],
      ['country not two letters', { country: 'USA' }, 'invalid_country'],
      ['country two letters but not ISO 3166-1', { country: 'ZZ' }, 'invalid_country'],
      ['flair over 50 chars', { flair: 'a'.repeat(51) }, 'flair_too_long'],
      ['fideId over 50 chars', { fideId: '1'.repeat(51) }, 'fide_id_too_long'],
      ['fideId with letters', { fideId: '123abc' }, 'fide_id_invalid_format'],
      ['fideId with path traversal', { fideId: '../etc' }, 'fide_id_invalid_format'],
      ['fideId with a null byte', { fideId: '123\x0045' }, 'fide_id_invalid_format'],
      ['fideId with Unicode digits', { fideId: '１２３４' }, 'fide_id_invalid_format'],
      [
        'chesscomUsername over 255 chars',
        { chesscomUsername: 'a'.repeat(256) },
        'chesscom_username_too_long',
      ],
      [
        'chesscomUsername with specials',
        { chesscomUsername: 'user@name!' },
        'chesscom_username_invalid_format',
      ],
      [
        'chesscomUsername with a dot',
        { chesscomUsername: 'user.name' },
        'chesscom_username_invalid_format',
      ],
      [
        'chesscomUsername URL-encoded traversal',
        { chesscomUsername: '..%2Fetc' },
        'chesscom_username_invalid_format',
      ],
      [
        'lichessUsername over 255 chars',
        { lichessUsername: 'a'.repeat(256) },
        'lichess_username_too_long',
      ],
      [
        'lichessUsername with a space',
        { lichessUsername: 'user name' },
        'lichess_username_invalid_format',
      ],
      [
        'lichessUsername with a chess glyph',
        { lichessUsername: 'player♟' },
        'lichess_username_invalid_format',
      ],
      ['xUsername over 15 chars', { xUsername: 'a'.repeat(16) }, 'x_username_too_long'],
      ['xUsername with a period', { xUsername: 'user.name' }, 'x_username_invalid_format'],
      ['xUsername with a hyphen', { xUsername: 'user-name' }, 'x_username_invalid_format'],
      ['xUsername with kana', { xUsername: 'ユーザー' }, 'x_username_invalid_format'],
      [
        'instagramUsername over 30 chars',
        { instagramUsername: 'a'.repeat(31) },
        'instagram_username_too_long',
      ],
      [
        'instagramUsername with a hyphen',
        { instagramUsername: 'user-name' },
        'instagram_username_invalid_format',
      ],
      ['youtubeHandle over 30 chars', { youtubeHandle: 'a'.repeat(31) }, 'youtube_handle_too_long'],
      [
        'youtubeHandle with an at-sign',
        { youtubeHandle: '@handle' },
        'youtube_handle_invalid_format',
      ],
    ];

    it.each(cases)('rejects %s', (_label, input, expected) => {
      const result = validate(input);
      expect(result).toEqual({ ok: false, error: expected });
    });

    it('reports the length violation before the format violation', () => {
      // Both rules fail here; the length check runs first, matching the
      // order the action used to apply inline.
      const result = validate({ xUsername: 'a-'.repeat(20) });
      expect(result).toEqual({ ok: false, error: 'x_username_too_long' });
    });
  });

  describe('normalization', () => {
    it('trims every field and collapses blanks to null', () => {
      const result = validate({
        displayName: '  Chess Player  ',
        bio: '   ',
        country: '  jp ',
        flair: '',
        fideId: ' 12345 ',
      });
      expect(result).toEqual({
        ok: true,
        values: {
          displayName: 'Chess Player',
          bio: null,
          country: 'JP',
          flair: null,
          fideId: '12345',
          chesscomUsername: null,
          lichessUsername: null,
          xUsername: null,
          instagramUsername: null,
          youtubeHandle: null,
        },
      });
    });

    it('uppercases a lowercase country code rather than rejecting it', () => {
      const result = validate({ country: 'us' });
      expect(result.ok && result.values.country).toBe('US');
    });

    it('accepts the boundary lengths of every limited field', () => {
      const result = validate(
        {
          displayName: 'a'.repeat(50),
          bio: 'a'.repeat(500),
          flair: 'a'.repeat(50),
          fideId: '1'.repeat(50),
          chesscomUsername: 'a'.repeat(255),
          lichessUsername: 'a'.repeat(255),
          xUsername: 'a'.repeat(15),
          instagramUsername: 'a'.repeat(30),
          youtubeHandle: 'a'.repeat(30),
        },
        noLameNames
      );
      expect(result.ok).toBe(true);
    });

    it('accepts the permitted punctuation of each social handle', () => {
      const result = validate({
        chesscomUsername: 'user_name-1',
        lichessUsername: 'user_name-1',
        xUsername: 'user_name1',
        instagramUsername: 'user.name_1',
        youtubeHandle: 'user.name-1',
      });
      expect(result.ok).toBe(true);
    });
  });
});
