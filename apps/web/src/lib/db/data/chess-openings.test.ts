import { describe, expect, it } from 'vitest';

import { isValidOpeningSlugFormat } from '@/app/[locale]/(public)/topics/openings/_lib/openings';

import { chessOpenings } from './chess-openings';

describe('chess-openings seed data integrity', () => {
  describe('data count', () => {
    it('should contain 104 opening families', () => {
      expect(chessOpenings).toHaveLength(104);
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

  describe('parentSlug integrity', () => {
    it('should have all parentSlug values reference an existing slug in the data', () => {
      const slugs = new Set(chessOpenings.map((o) => o.slug));
      const withParent = chessOpenings.filter((o) => o.parentSlug);
      for (const opening of withParent) {
        expect(
          slugs.has(opening.parentSlug!),
          `parentSlug "${opening.parentSlug}" for "${opening.name}" does not reference an existing slug`
        ).toBe(true);
      }
    });

    it('should have no circular references', () => {
      const parentMap = new Map<string, string>();
      for (const opening of chessOpenings) {
        if (opening.parentSlug) {
          parentMap.set(opening.slug, opening.parentSlug);
        }
      }

      for (const [slug] of parentMap) {
        const visited = new Set<string>();
        let current: string | undefined = slug;
        while (current && parentMap.has(current)) {
          expect(visited.has(current), `Circular reference detected involving "${current}"`).toBe(
            false
          );
          visited.add(current);
          current = parentMap.get(current);
        }
      }
    });

    it('should not have a parentSlug that references itself', () => {
      for (const opening of chessOpenings) {
        if (opening.parentSlug) {
          expect(
            opening.parentSlug !== opening.slug,
            `Opening "${opening.slug}" references itself as parent`
          ).toBe(true);
        }
      }
    });

    it('should enforce max depth of 2 (parentSlug must not reference another child)', () => {
      const childSlugs = new Set(chessOpenings.filter((o) => o.parentSlug).map((o) => o.slug));
      for (const opening of chessOpenings) {
        if (opening.parentSlug) {
          expect(
            childSlugs.has(opening.parentSlug),
            `Opening "${opening.slug}" has parentSlug "${opening.parentSlug}" which is itself a child — max depth exceeded`
          ).toBe(false);
        }
      }
    });

    it('should have exactly 46 child openings (with parentSlug)', () => {
      const childCount = chessOpenings.filter((o) => o.parentSlug).length;
      expect(childCount).toBe(46);
    });

    it('should have exactly 58 root openings (without parentSlug)', () => {
      const rootCount = chessOpenings.filter((o) => !o.parentSlug).length;
      expect(rootCount).toBe(58);
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
