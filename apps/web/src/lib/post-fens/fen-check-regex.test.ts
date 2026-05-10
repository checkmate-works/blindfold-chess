/**
 * Pin the DB CHECK regex for `post_fen_attachments.fen` byte-for-byte.
 *
 * @description
 * The migration ships a Postgres CHECK that pins the FEN field shape:
 *
 *   ^[rnbqkpRNBQKP1-8/]+ [wb] (-|[KQkq]+) (-|[a-h][36]) [0-9]+ [0-9]+$
 *
 * This test transcribes that regex into a JS test (Postgres POSIX `~` flavor
 * happens to overlap with JS regex for this expression's character classes
 * and quantifiers — there are no `\b` or POSIX-only constructs). Each
 * tightening vs. the issue spec is exercised explicitly so a future relaxation
 * of the regex (e.g. a copy-paste of Shredder-FEN castling) fails here loudly.
 *
 * The Drizzle table definition (`postFenAttachments` in
 * `apps/web/src/lib/db/schema/tables.ts`) carries the same regex inside the
 * `check()` clause, and the meta snapshot under `apps/web/drizzle/meta/`
 * mirrors it again. Triple-aligned.
 */
import { describe, expect, it } from 'vitest';

// Byte-for-byte transcription. KEEP in sync with:
//   1. apps/web/drizzle/20260504070000_create_post_fen_attachments.sql (CHECK)
//   2. apps/web/src/lib/db/schema/tables.ts (postFenAttachments check())
//   3. apps/web/drizzle/meta/20260504070000_snapshot.json (post_fen_attachments_chk_fen_format)
const FEN_CHECK_RE = /^[rnbqkpRNBQKP1-8/]+ [wb] (-|[KQkq]+) (-|[a-h][36]) [0-9]+ [0-9]+$/;

describe('post_fen_attachments DB CHECK regex (transcribed)', () => {
  describe('accepts canonical FENs', () => {
    it('accepts the standard starting position', () => {
      expect(FEN_CHECK_RE.test('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe(
        true
      );
    });

    it('accepts a typical mid-game FEN', () => {
      expect(
        FEN_CHECK_RE.test('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3')
      ).toBe(true);
    });

    it('accepts a FEN with no castling and no en passant', () => {
      expect(FEN_CHECK_RE.test('4k3/8/8/8/8/8/8/4K3 w - - 0 1')).toBe(true);
    });

    it('accepts en passant on rank 3 (black to move)', () => {
      expect(FEN_CHECK_RE.test('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1')).toBe(
        true
      );
    });

    it('accepts en passant on rank 6 (white to move)', () => {
      expect(
        FEN_CHECK_RE.test('rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3')
      ).toBe(true);
    });
  });

  describe('rejects malformed inputs (hostile)', () => {
    it('rejects an empty string', () => {
      expect(FEN_CHECK_RE.test('')).toBe(false);
    });

    it('rejects a whitespace-only string', () => {
      expect(FEN_CHECK_RE.test('   ')).toBe(false);
    });

    it('rejects a string consisting of only a newline', () => {
      expect(FEN_CHECK_RE.test('\n')).toBe(false);
    });

    it('rejects a FEN with embedded ASCII control characters', () => {
      expect(
        FEN_CHECK_RE.test(
          `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1${String.fromCharCode(0)}`
        )
      ).toBe(false);
    });

    it('rejects a FEN with bidi codepoints', () => {
      expect(
        FEN_CHECK_RE.test(
          `${String.fromCharCode(0x202e)}rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1`
        )
      ).toBe(false);
    });

    it('rejects an oversized blob of garbage', () => {
      expect(FEN_CHECK_RE.test('x'.repeat(500))).toBe(false);
    });

    it('rejects a FEN missing fields', () => {
      expect(FEN_CHECK_RE.test('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')).toBe(false);
    });
  });

  describe('castling tightening — Chess960 / Shredder-FEN rejected', () => {
    it('rejects Shredder-FEN castling using file letters (uppercase)', () => {
      expect(FEN_CHECK_RE.test('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w AHah - 0 1')).toBe(
        false
      );
    });

    it('rejects Shredder-FEN castling using lowercase file letters', () => {
      expect(FEN_CHECK_RE.test('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w ah - 0 1')).toBe(
        false
      );
    });

    it('rejects an unknown castling character', () => {
      expect(FEN_CHECK_RE.test('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w X - 0 1')).toBe(
        false
      );
    });
  });

  describe('en passant tightening — only rank 3 or 6 admitted', () => {
    it('rejects en passant on rank 1', () => {
      expect(FEN_CHECK_RE.test('4k3/8/8/8/8/8/8/4K3 w - e1 0 1')).toBe(false);
    });

    it('rejects en passant on rank 2', () => {
      expect(FEN_CHECK_RE.test('4k3/8/8/8/8/8/8/4K3 w - e2 0 1')).toBe(false);
    });

    it('rejects en passant on rank 4', () => {
      expect(FEN_CHECK_RE.test('4k3/8/8/8/8/8/8/4K3 w - e4 0 1')).toBe(false);
    });

    it('rejects en passant on rank 5', () => {
      expect(FEN_CHECK_RE.test('4k3/8/8/8/8/8/8/4K3 w - e5 0 1')).toBe(false);
    });

    it('rejects en passant on rank 7', () => {
      expect(FEN_CHECK_RE.test('4k3/8/8/8/8/8/8/4K3 w - e7 0 1')).toBe(false);
    });

    it('rejects en passant on rank 8', () => {
      expect(FEN_CHECK_RE.test('4k3/8/8/8/8/8/8/4K3 w - e8 0 1')).toBe(false);
    });
  });

  describe('field-count tightening', () => {
    it('rejects a FEN with an extra trailing field', () => {
      // Standard six fields plus one trailing token. The regex anchors at
      // `$`, so the trailing space + token must fail.
      expect(
        FEN_CHECK_RE.test('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 extra')
      ).toBe(false);
    });

    it('rejects a FEN with leading whitespace before the placement', () => {
      // The regex anchors at `^`, so any leading whitespace fails.
      expect(FEN_CHECK_RE.test(' rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe(
        false
      );
    });
  });

  describe('side-to-move', () => {
    it('rejects uppercase W as side-to-move', () => {
      expect(FEN_CHECK_RE.test('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR W KQkq - 0 1')).toBe(
        false
      );
    });

    it('rejects an arbitrary letter as side-to-move', () => {
      expect(FEN_CHECK_RE.test('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR x KQkq - 0 1')).toBe(
        false
      );
    });
  });
});
