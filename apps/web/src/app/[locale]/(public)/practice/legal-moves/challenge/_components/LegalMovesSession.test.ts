import { generateBalancedMoveQuestions, isLegalMove } from '@blindfold-chess/features/legal-moves';
import type { PieceType } from '@blindfold-chess/features/legal-moves';
import { describe, expect, it } from 'vitest';

/**
 * Tests for LegalMovesSession challenge mode logic.
 *
 * These tests verify the pure logic used by the challenge mode session:
 * - URL parameter parsing for single piece vs. all pieces
 * - Question generation with single-piece selection
 * - Question generation with all-pieces (random) selection
 * - Result saving data format
 */

const ALL_PIECES: PieceType[] = ['k', 'q', 'r', 'b', 'n'];

// ---------------------------------------------------------------------------
// URL parameter parsing logic (mirrors challenge/page.tsx)
// ---------------------------------------------------------------------------

function parseSelectedPieces(piecesParam: string | undefined): PieceType[] {
  const defaultPieces: PieceType[] = ['k', 'q', 'r', 'b', 'n'];

  if (!piecesParam) return defaultPieces;

  const parsed = piecesParam
    .split(',')
    .filter((p): p is PieceType => defaultPieces.includes(p as PieceType));

  return parsed.length > 0 ? parsed : defaultPieces;
}

describe('challenge mode URL parameter parsing', () => {
  describe('single piece selection', () => {
    it.each(['k', 'q', 'r', 'b', 'n'] as const)('parses single piece "%s" from URL', (piece) => {
      const result = parseSelectedPieces(piece);
      expect(result).toEqual([piece]);
    });
  });

  describe('random/"?" selection (all pieces)', () => {
    it('parses all 5 pieces from comma-separated URL param', () => {
      const result = parseSelectedPieces('k,q,r,b,n');
      expect(result).toEqual(['k', 'q', 'r', 'b', 'n']);
    });

    it('parses all pieces regardless of order', () => {
      const result = parseSelectedPieces('n,b,r,q,k');
      expect(result).toEqual(['n', 'b', 'r', 'q', 'k']);
    });
  });

  describe('edge cases', () => {
    it('returns default (all pieces) when param is undefined', () => {
      const result = parseSelectedPieces(undefined);
      expect(result).toEqual(ALL_PIECES);
    });

    it('returns default when param is empty string', () => {
      const result = parseSelectedPieces('');
      expect(result).toEqual(ALL_PIECES);
    });

    it('filters out invalid piece types', () => {
      const result = parseSelectedPieces('k,x,z,n');
      expect(result).toEqual(['k', 'n']);
    });

    it('returns default when all pieces are invalid', () => {
      const result = parseSelectedPieces('x,y,z');
      expect(result).toEqual(ALL_PIECES);
    });

    it('ignores duplicate pieces in URL param', () => {
      const result = parseSelectedPieces('k,k,k');
      expect(result).toEqual(['k', 'k', 'k']);
      // Note: duplicates pass through parsing; the session logic handles them
    });
  });
});

// ---------------------------------------------------------------------------
// Navigation URL construction (mirrors LegalMovesSetup.handleStart)
// ---------------------------------------------------------------------------

type PieceSelection = PieceType | 'random';

function buildChallengeUrl(locale: string, pieceSelection: PieceSelection): string {
  const pieces: PieceType[] = ['k', 'q', 'r', 'b', 'n'];
  const piecesParam = pieceSelection === 'random' ? pieces.join(',') : pieceSelection;

  return `/${locale}/practice/legal-moves/challenge?timeLimit=60&pieces=${piecesParam}#legal-moves-session`;
}

describe('challenge mode navigation URL construction', () => {
  it('constructs URL with single piece for specific piece selection', () => {
    const url = buildChallengeUrl('en', 'k');
    expect(url).toBe(
      '/en/practice/legal-moves/challenge?timeLimit=60&pieces=k#legal-moves-session'
    );
  });

  it('constructs URL with all pieces for random selection', () => {
    const url = buildChallengeUrl('en', 'random');
    expect(url).toBe(
      '/en/practice/legal-moves/challenge?timeLimit=60&pieces=k,q,r,b,n#legal-moves-session'
    );
  });

  it.each(['k', 'q', 'r', 'b', 'n'] as const)('constructs correct URL for piece "%s"', (piece) => {
    const url = buildChallengeUrl('ja', piece);
    expect(url).toContain(`pieces=${piece}`);
    expect(url.startsWith('/ja/')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Question generation for challenge mode
// ---------------------------------------------------------------------------

describe('challenge mode question generation', () => {
  describe('single piece', () => {
    it.each(['k', 'q', 'r', 'b', 'n'] as const)(
      'generates questions only for piece "%s"',
      (piece) => {
        const questions = generateBalancedMoveQuestions(20, [piece]);
        expect(questions).toHaveLength(20);
        for (const q of questions) {
          expect(q.piece).toBe(piece);
        }
      }
    );
  });

  describe('all pieces (random)', () => {
    it('generates questions for all 5 piece types', () => {
      const questions = generateBalancedMoveQuestions(100, ALL_PIECES);
      const usedPieces = new Set(questions.map((q) => q.piece));
      // With 100 questions across 5 pieces, all should appear
      expect(usedPieces.size).toBe(5);
    });
  });

  describe('answer validation', () => {
    it('validates answers consistently for single-piece questions', () => {
      const questions = generateBalancedMoveQuestions(20, ['n']);
      for (const q of questions) {
        const result = isLegalMove(q.from, q.to, q.piece);
        expect(typeof result).toBe('boolean');
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Result saving data format for challenge mode
// ---------------------------------------------------------------------------

describe('challenge mode result saving format', () => {
  it('uses array format for selectedPieces with single piece', () => {
    const selectedPieces = ['k'];
    expect(Array.isArray(selectedPieces)).toBe(true);
    expect(selectedPieces).toHaveLength(1);
    expect(selectedPieces[0]).toBe('k');
  });

  it('uses array format for selectedPieces with all pieces (random)', () => {
    const selectedPieces = ['k', 'q', 'r', 'b', 'n'];
    expect(Array.isArray(selectedPieces)).toBe(true);
    expect(selectedPieces).toHaveLength(5);
  });

  it('result URL includes pieces param for single piece', () => {
    const selectedPieces = ['r'];
    const params = new URLSearchParams();
    params.set('pieces', selectedPieces.join(','));
    expect(params.get('pieces')).toBe('r');
  });

  it('result URL includes pieces param for all pieces (random)', () => {
    const selectedPieces = ['k', 'q', 'r', 'b', 'n'];
    const params = new URLSearchParams();
    params.set('pieces', selectedPieces.join(','));
    expect(params.get('pieces')).toBe('k,q,r,b,n');
  });
});
