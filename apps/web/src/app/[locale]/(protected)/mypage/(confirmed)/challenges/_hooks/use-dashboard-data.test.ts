import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import {
  ORIENTATION_FILTER_MENUS,
  PIECE_FILTER_MENUS,
  PIECE_TYPES,
  type PieceSelection,
} from './use-dashboard-data';

describe('DASHBOARD_TABLE_ROWS', () => {
  it('is set to 5 (dashboard shows only recent 5 results)', () => {
    // DASHBOARD_TABLE_ROWS is not exported, so we verify via source code inspection.
    const sourcePath = resolve(__dirname, './use-dashboard-data.ts');
    const source = readFileSync(sourcePath, 'utf-8');
    const match = source.match(/const\s+DASHBOARD_TABLE_ROWS\s*=\s*(\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(5);
  });
});

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
// PieceSelection -> activePiece mapping
// ---------------------------------------------------------------------------
// This mirrors the derivation logic in useDashboardData:
//   pieceFilter === 'random' -> 'random'
//   pieceFilter === 'n'      -> 'knight' (full name)
// The filter then does an exact match between session.selectedPiece and activePiece.

const PIECE_SHORT_TO_NAME: Record<string, string> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
};

function deriveActivePiece(pieceFilter: PieceSelection): string {
  return pieceFilter === 'random' ? 'random' : (PIECE_SHORT_TO_NAME[pieceFilter] ?? 'random');
}

function sessionMatchesFilter(sessionPiece: string, activePiece: string): boolean {
  return sessionPiece === activePiece;
}

describe('PieceSelection filter matching', () => {
  describe('activePiece derivation from PieceSelection', () => {
    it('random produces "random"', () => {
      expect(deriveActivePiece('random')).toBe('random');
    });

    it.each([
      ['k', 'king'],
      ['q', 'queen'],
      ['r', 'rook'],
      ['b', 'bishop'],
      ['n', 'knight'],
    ] as const)('single piece "%s" produces full name "%s"', (piece, name) => {
      expect(deriveActivePiece(piece)).toBe(name);
    });
  });

  describe('single piece selection matches single-piece sessions', () => {
    it.each([
      ['k', 'king'],
      ['q', 'queen'],
      ['r', 'rook'],
      ['b', 'bishop'],
      ['n', 'knight'],
    ] as const)('filter "%s" matches session with "%s"', (piece, name) => {
      const activePiece = deriveActivePiece(piece);
      expect(sessionMatchesFilter(name, activePiece)).toBe(true);
    });

    it('filter "n" does not match session with "bishop"', () => {
      const activePiece = deriveActivePiece('n');
      expect(sessionMatchesFilter('bishop', activePiece)).toBe(false);
    });
  });

  describe('random selection matches random sessions', () => {
    it('random filter matches session with "random"', () => {
      const activePiece = deriveActivePiece('random');
      expect(sessionMatchesFilter('random', activePiece)).toBe(true);
    });

    it('random filter does not match single-piece session', () => {
      const activePiece = deriveActivePiece('random');
      expect(sessionMatchesFilter('knight', activePiece)).toBe(false);
    });
  });
});
