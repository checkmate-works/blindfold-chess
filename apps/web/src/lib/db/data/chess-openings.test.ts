import { describe, expect, it } from 'vitest';

import { isValidOpeningSlugFormat } from '@/app/[locale]/(public)/topics/openings/_lib/openings';

import { chessOpenings } from './chess-openings';

describe('chess-openings seed data integrity', () => {
  describe('data count', () => {
    it('should contain 72 opening families', () => {
      expect(chessOpenings).toHaveLength(72);
    });
  });

  describe('slug uniqueness', () => {
    it('should have all unique slugs', () => {
      const slugs = chessOpenings.map((o) => o.slug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(slugs.length);
    });
  });

  describe('slug format', () => {
    it('should have all slugs pass isValidOpeningSlugFormat', () => {
      for (const opening of chessOpenings) {
        expect(
          isValidOpeningSlugFormat(opening.slug),
          `Invalid slug format: "${opening.slug}" for "${opening.name}"`
        ).toBe(true);
      }
    });
  });

  describe('name uniqueness', () => {
    it('should have all unique names', () => {
      const names = chessOpenings.map((o) => o.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('eco_code format', () => {
    it('should have all eco codes matching /^[A-E]\\d{2}$/', () => {
      const ecoPattern = /^[A-E]\d{2}$/;
      for (const opening of chessOpenings) {
        expect(
          ecoPattern.test(opening.ecoCode),
          `Invalid ECO code: "${opening.ecoCode}" for "${opening.name}"`
        ).toBe(true);
      }
    });
  });

  describe('firstMoveSquare format', () => {
    it('should have all firstMoveSquare values as valid chess squares', () => {
      const squarePattern = /^[a-h][1-8]$/;
      for (const opening of chessOpenings) {
        expect(
          squarePattern.test(opening.firstMoveSquare),
          `Invalid firstMoveSquare: "${opening.firstMoveSquare}" for "${opening.name}"`
        ).toBe(true);
      }
    });

    it('should only reference squares reachable by a first move', () => {
      // First moves in chess can only target ranks 3 and 4 (pawn moves)
      // or specific knight squares (f3, c3 for white). Let's verify all
      // firstMoveSquare values are plausible.
      const validFirstMoveSquares = new Set([
        // Pawn moves: a-h on ranks 3 and 4
        'a3',
        'a4',
        'b3',
        'b4',
        'c3',
        'c4',
        'd3',
        'd4',
        'e3',
        'e4',
        'f3',
        'f4',
        'g3',
        'g4',
        'h3',
        'h4',
        // Knight moves from b1 and g1
        'a3',
        'c3',
        'f3',
        'h3',
      ]);
      for (const opening of chessOpenings) {
        expect(
          validFirstMoveSquares.has(opening.firstMoveSquare),
          `firstMoveSquare "${opening.firstMoveSquare}" for "${opening.name}" is not a valid first move destination`
        ).toBe(true);
      }
    });
  });

  describe('PGN format', () => {
    it('should have all PGN values starting with "1."', () => {
      for (const opening of chessOpenings) {
        expect(
          opening.pgn.startsWith('1.'),
          `PGN for "${opening.name}" does not start with "1.": "${opening.pgn}"`
        ).toBe(true);
      }
    });

    it('should have all PGN values as non-empty strings', () => {
      for (const opening of chessOpenings) {
        expect(opening.pgn.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('sortOrder', () => {
    it('should have all sortOrder values as positive integers', () => {
      for (const opening of chessOpenings) {
        expect(opening.sortOrder).toBeGreaterThan(0);
        expect(Number.isInteger(opening.sortOrder)).toBe(true);
      }
    });
  });

  describe('firstMoveSquare consistency with PGN', () => {
    it('should have firstMoveSquare consistent with the PGN first move', () => {
      // Map from common PGN first-move notation to target square
      const moveToSquare: Record<string, string> = {
        e4: 'e4',
        e3: 'e3',
        d4: 'd4',
        d3: 'd3',
        c4: 'c4',
        c3: 'c3',
        Nf3: 'f3',
        Nc3: 'c3',
        f4: 'f4',
        f3: 'f3',
        b3: 'b3',
        b4: 'b4',
        g3: 'g3',
        g4: 'g4',
      };

      for (const opening of chessOpenings) {
        // Extract first move from PGN (e.g., "1. e4 ..." -> "e4")
        const match = opening.pgn.match(/^1\.\s*(\S+)/);
        expect(match, `Cannot parse first move from PGN: "${opening.pgn}"`).not.toBeNull();

        const firstMove = match![1];
        const expectedSquare = moveToSquare[firstMove];
        expect(
          expectedSquare,
          `Unknown first move "${firstMove}" in PGN for "${opening.name}"`
        ).toBeDefined();
        expect(
          opening.firstMoveSquare,
          `firstMoveSquare mismatch for "${opening.name}": PGN first move is "${firstMove}" (expected square "${expectedSquare}") but got "${opening.firstMoveSquare}"`
        ).toBe(expectedSquare);
      }
    });
  });
});
