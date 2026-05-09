// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { PIECES } from './pieces';
import type { RoutePlannerPieceSelection } from './pieces';
import { PIECE_NAME_TO_TYPE, PIECE_TYPE_TO_NAME } from './query-params';

describe('route-planner _lib pieces and query-params', () => {
  describe('PIECES', () => {
    it('contains only knight and bishop', () => {
      expect(PIECES).toEqual(['n', 'b']);
    });
  });

  describe('PIECE_TYPE_TO_NAME', () => {
    it('maps knight and bishop to their English names', () => {
      expect(PIECE_TYPE_TO_NAME['n']).toBe('knight');
      expect(PIECE_TYPE_TO_NAME['b']).toBe('bishop');
    });

    it('covers all pieces in PIECES', () => {
      for (const piece of PIECES) {
        expect(PIECE_TYPE_TO_NAME[piece]).toBeDefined();
        expect(typeof PIECE_TYPE_TO_NAME[piece]).toBe('string');
        expect(PIECE_TYPE_TO_NAME[piece]!.length).toBeGreaterThan(0);
      }
    });

    it('does not contain entries for rook, queen, or other piece types', () => {
      expect(PIECE_TYPE_TO_NAME['r']).toBeUndefined();
      expect(PIECE_TYPE_TO_NAME['q']).toBeUndefined();
      expect(PIECE_TYPE_TO_NAME['k']).toBeUndefined();
      expect(PIECE_TYPE_TO_NAME['p']).toBeUndefined();
    });
  });

  describe('PIECE_NAME_TO_TYPE', () => {
    it('maps English piece names back to piece type codes', () => {
      expect(PIECE_NAME_TO_TYPE['knight']).toBe('n');
      expect(PIECE_NAME_TO_TYPE['bishop']).toBe('b');
    });

    it('is the inverse of PIECE_TYPE_TO_NAME', () => {
      for (const [type, name] of Object.entries(PIECE_TYPE_TO_NAME)) {
        expect(PIECE_NAME_TO_TYPE[name]).toBe(type);
      }
      for (const [name, type] of Object.entries(PIECE_NAME_TO_TYPE)) {
        expect(PIECE_TYPE_TO_NAME[type]).toBe(name);
      }
    });

    it('returns undefined for removed and unknown names', () => {
      expect(PIECE_NAME_TO_TYPE['rook']).toBeUndefined();
      expect(PIECE_NAME_TO_TYPE['queen']).toBeUndefined();
      expect(PIECE_NAME_TO_TYPE['pawn']).toBeUndefined();
      expect(PIECE_NAME_TO_TYPE['king']).toBeUndefined();
      expect(PIECE_NAME_TO_TYPE['']).toBeUndefined();
    });
  });

  describe('RoutePlannerPieceSelection type', () => {
    it('accepts valid piece types (knight and bishop only)', () => {
      const selections: RoutePlannerPieceSelection[] = ['n', 'b'];
      expect(selections).toHaveLength(2);
      for (const sel of selections) {
        expect(typeof sel).toBe('string');
      }
    });
  });
});
