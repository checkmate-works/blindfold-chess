import { describe, expect, it } from 'vitest';

import {
  ORIENTATION_FILTER_MENUS,
  PIECE_FILTER_MENUS,
  PIECE_TYPES,
  type PieceSelection,
} from './use-dashboard-data';

describe('PIECE_TYPES', () => {
  it('contains exactly king, queen, rook, bishop, and knight', () => {
    expect([...PIECE_TYPES]).toEqual(['k', 'q', 'r', 'b', 'n']);
  });

  it('has 5 entries', () => {
    expect(PIECE_TYPES).toHaveLength(5);
  });
});

describe('ORIENTATION_FILTER_MENUS', () => {
  it('contains coordinate_quiz', () => {
    expect(ORIENTATION_FILTER_MENUS.has('coordinate_quiz')).toBe(true);
  });

  it('does not contain legal_moves', () => {
    expect(ORIENTATION_FILTER_MENUS.has('legal_moves')).toBe(false);
  });

  it('does not contain square_colors', () => {
    expect(ORIENTATION_FILTER_MENUS.has('square_colors')).toBe(false);
  });

  it('has exactly 1 entry', () => {
    expect(ORIENTATION_FILTER_MENUS.size).toBe(1);
  });
});

describe('PIECE_FILTER_MENUS', () => {
  it('contains legal_moves', () => {
    expect(PIECE_FILTER_MENUS.has('legal_moves')).toBe(true);
  });

  it('does not contain coordinate_quiz', () => {
    expect(PIECE_FILTER_MENUS.has('coordinate_quiz')).toBe(false);
  });

  it('does not contain square_colors', () => {
    expect(PIECE_FILTER_MENUS.has('square_colors')).toBe(false);
  });

  it('has exactly 1 entry', () => {
    expect(PIECE_FILTER_MENUS.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// PieceSelection → activePieces mapping
// ---------------------------------------------------------------------------
// This mirrors the derivation logic in useDashboardData:
//   pieceFilter === 'random' → [...PIECE_TYPES].sort() (all 5 sorted)
//   pieceFilter === 'n'      → ['n']               (single piece)
// The filter then does an exact match between session.selectedPieces (sorted)
// and activePieces.

function deriveActivePieces(pieceFilter: PieceSelection): string[] {
  return pieceFilter === 'random' ? [...PIECE_TYPES].sort() : [pieceFilter];
}

function sessionMatchesFilter(sessionPieces: string[], activePieces: string[]): boolean {
  const sorted = [...sessionPieces].sort();
  return sorted.length === activePieces.length && sorted.every((p, i) => p === activePieces[i]);
}

describe('PieceSelection filter matching', () => {
  describe('activePieces derivation from PieceSelection', () => {
    it('random produces all 5 pieces sorted', () => {
      expect(deriveActivePieces('random')).toEqual(['b', 'k', 'n', 'q', 'r']);
    });

    it.each(['k', 'q', 'r', 'b', 'n'] as const)(
      'single piece "%s" produces array with just that piece',
      (piece) => {
        expect(deriveActivePieces(piece)).toEqual([piece]);
      }
    );
  });

  describe('single piece selection matches single-piece sessions', () => {
    it.each(['k', 'q', 'r', 'b', 'n'] as const)(
      'filter "%s" matches session with ["%s"]',
      (piece) => {
        const activePieces = deriveActivePieces(piece);
        expect(sessionMatchesFilter([piece], activePieces)).toBe(true);
      }
    );

    it('filter "n" does not match session with ["b"]', () => {
      const activePieces = deriveActivePieces('n');
      expect(sessionMatchesFilter(['b'], activePieces)).toBe(false);
    });
  });

  describe('random selection matches all-5-pieces sessions', () => {
    it('random filter matches session with all 5 pieces', () => {
      const activePieces = deriveActivePieces('random');
      expect(sessionMatchesFilter(['k', 'q', 'r', 'b', 'n'], activePieces)).toBe(true);
    });

    it('random filter matches session with all 5 pieces in different order', () => {
      const activePieces = deriveActivePieces('random');
      expect(sessionMatchesFilter(['n', 'b', 'r', 'q', 'k'], activePieces)).toBe(true);
    });

    it('random filter does not match single-piece session', () => {
      const activePieces = deriveActivePieces('random');
      expect(sessionMatchesFilter(['n'], activePieces)).toBe(false);
    });
  });

  describe('legacy multi-piece records do not match any single-select filter', () => {
    const legacyCombinations = [
      ['n', 'b'],
      ['k', 'q'],
      ['r', 'b', 'n'],
      ['k', 'q', 'r', 'b'],
    ];

    it.each(legacyCombinations)(
      'legacy combination %j does not match any single-piece filter',
      (...pieces) => {
        for (const singlePiece of PIECE_TYPES) {
          const activePieces = deriveActivePieces(singlePiece);
          expect(sessionMatchesFilter(pieces, activePieces)).toBe(false);
        }
      }
    );

    it.each(legacyCombinations)(
      'legacy combination %j does not match random filter either',
      (...pieces) => {
        const activePieces = deriveActivePieces('random');
        expect(sessionMatchesFilter(pieces, activePieces)).toBe(false);
      }
    );
  });
});
