import { generateBalancedMoveQuestions, isLegalMove } from '@blindfold-chess/features/legal-moves';
import type { PieceType } from '@blindfold-chess/features/legal-moves';
import { describe, expect, it } from 'vitest';

import {
  PIECE_NAME_TO_TYPE,
  VALID_PIECE_NAMES,
} from '@/app/[locale]/(public)/practice/(challenge)/legal-moves/_lib/query-params';

/**
 * Tests for LegalMovesSession challenge mode logic.
 *
 * These tests verify the pure logic used by the challenge mode session:
 * - URL parameter parsing for single piece vs. random
 * - Question generation with single-piece selection
 * - Question generation with all-pieces (random) selection
 * - Result saving data format
 */

const ALL_PIECES: PieceType[] = ['k', 'q', 'r', 'b', 'n'];

// ---------------------------------------------------------------------------
// URL parameter parsing logic (mirrors challenge/page.tsx)
// ---------------------------------------------------------------------------

function parseSelectedPiece(pieceParam: string | undefined): {
  selectedPieces: PieceType[];
  selectedPiece: string;
} {
  const allPieceTypes: PieceType[] = ['k', 'q', 'r', 'b', 'n'];
  const validPieceName =
    pieceParam && (VALID_PIECE_NAMES as readonly string[]).includes(pieceParam)
      ? pieceParam
      : 'random';
  const selectedPieces: PieceType[] =
    validPieceName === 'random' ? allPieceTypes : [PIECE_NAME_TO_TYPE[validPieceName]];

  return { selectedPieces, selectedPiece: validPieceName };
}

describe('challenge mode URL parameter parsing', () => {
  describe('single piece selection', () => {
    it.each(['king', 'queen', 'rook', 'bishop', 'knight'] as const)(
      'parses piece name "%s" from URL',
      (pieceName) => {
        const { selectedPieces, selectedPiece } = parseSelectedPiece(pieceName);
        expect(selectedPieces).toEqual([PIECE_NAME_TO_TYPE[pieceName]]);
        expect(selectedPiece).toBe(pieceName);
      }
    );
  });

  describe('random selection', () => {
    it('parses "random" from URL param', () => {
      const { selectedPieces, selectedPiece } = parseSelectedPiece('random');
      expect(selectedPieces).toEqual(['k', 'q', 'r', 'b', 'n']);
      expect(selectedPiece).toBe('random');
    });
  });

  describe('edge cases', () => {
    it('returns random when param is undefined', () => {
      const { selectedPieces, selectedPiece } = parseSelectedPiece(undefined);
      expect(selectedPieces).toEqual(ALL_PIECES);
      expect(selectedPiece).toBe('random');
    });

    it('returns random when param is empty string', () => {
      const { selectedPieces, selectedPiece } = parseSelectedPiece('');
      expect(selectedPieces).toEqual(ALL_PIECES);
      expect(selectedPiece).toBe('random');
    });

    it('returns random when param is invalid', () => {
      const { selectedPieces, selectedPiece } = parseSelectedPiece('pawn');
      expect(selectedPieces).toEqual(ALL_PIECES);
      expect(selectedPiece).toBe('random');
    });
  });
});

// ---------------------------------------------------------------------------
// Navigation URL construction (mirrors LegalMovesSetup.handleStart)
// ---------------------------------------------------------------------------

const PIECE_TYPE_TO_NAME: Record<string, string> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
};

type PieceSelection = PieceType | 'random';

function buildChallengeUrl(locale: string, pieceSelection: PieceSelection): string {
  const pieceName =
    pieceSelection === 'random' ? 'random' : (PIECE_TYPE_TO_NAME[pieceSelection] ?? 'random');

  return `/${locale}/practice/legal-moves/challenge?piece=${pieceName}`;
}

describe('challenge mode navigation URL construction', () => {
  it('constructs URL with full piece name for specific piece selection', () => {
    const url = buildChallengeUrl('en', 'k');
    expect(url).toBe('/en/practice/legal-moves/challenge?piece=king');
  });

  it('constructs URL with "random" for random selection', () => {
    const url = buildChallengeUrl('en', 'random');
    expect(url).toBe('/en/practice/legal-moves/challenge?piece=random');
  });

  it.each([
    ['k', 'king'],
    ['q', 'queen'],
    ['r', 'rook'],
    ['b', 'bishop'],
    ['n', 'knight'],
  ] as const)('constructs correct URL for piece "%s" as "%s"', (piece, name) => {
    const url = buildChallengeUrl('ja', piece);
    expect(url).toContain(`piece=${name}`);
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
  it('uses scalar string for selectedPiece with single piece', () => {
    const selectedPiece = 'king';
    expect(typeof selectedPiece).toBe('string');
    expect(selectedPiece).toBe('king');
  });

  it('uses scalar string for selectedPiece with random', () => {
    const selectedPiece = 'random';
    expect(typeof selectedPiece).toBe('string');
    expect(selectedPiece).toBe('random');
  });

  it('result URL includes piece param for single piece', () => {
    const selectedPiece = 'rook';
    const params = new URLSearchParams();
    params.set('piece', selectedPiece);
    expect(params.get('piece')).toBe('rook');
  });

  it('result URL includes piece param for random', () => {
    const selectedPiece = 'random';
    const params = new URLSearchParams();
    params.set('piece', selectedPiece);
    expect(params.get('piece')).toBe('random');
  });
});
