import type { AlgebraicNotation } from '@blindfold-chess/types';
import { describe, expect, it } from 'vitest';

import { formatLastMove } from './utils';

describe('formatLastMove', () => {
  describe('empty moves', () => {
    it('returns "-" for empty moves array', () => {
      expect(formatLastMove([], 'white')).toBe('-');
      expect(formatLastMove([], 'black')).toBe('-');
    });
  });

  describe('white player perspective', () => {
    it('formats single white move correctly', () => {
      const moves: AlgebraicNotation[] = ['e4'];
      expect(formatLastMove(moves, 'white')).toBe('1. e4');
    });

    it('formats first full turn (white and black) correctly', () => {
      const moves: AlgebraicNotation[] = ['e4', 'e5'];
      expect(formatLastMove(moves, 'white')).toBe('1. e4 e5');
    });

    it('formats second white move correctly', () => {
      const moves: AlgebraicNotation[] = ['e4', 'e5', 'Nf3'];
      expect(formatLastMove(moves, 'white')).toBe('2. Nf3');
    });

    it('formats second full turn correctly', () => {
      const moves: AlgebraicNotation[] = ['e4', 'e5', 'Nf3', 'Nc6'];
      expect(formatLastMove(moves, 'white')).toBe('2. Nf3 Nc6');
    });

    it('formats third white move correctly', () => {
      const moves: AlgebraicNotation[] = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'];
      expect(formatLastMove(moves, 'white')).toBe('3. Bc4');
    });

    it('formats third full turn correctly', () => {
      const moves: AlgebraicNotation[] = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'];
      expect(formatLastMove(moves, 'white')).toBe('3. Bc4 Nf6');
    });

    it('handles castling moves', () => {
      const moves: AlgebraicNotation[] = ['e4', 'e5', 'Nf3', 'Nc6', 'O-O'];
      expect(formatLastMove(moves, 'white')).toBe('3. O-O');
    });

    it('handles capture moves', () => {
      const moves: AlgebraicNotation[] = ['e4', 'd5', 'exd5'];
      expect(formatLastMove(moves, 'white')).toBe('2. exd5');
    });

    it('handles check and checkmate notation', () => {
      const moves1: AlgebraicNotation[] = ['e4', 'e5', 'Qh5+'];
      expect(formatLastMove(moves1, 'white')).toBe('2. Qh5+');

      const moves2: AlgebraicNotation[] = ['f3', 'e5', 'g4', 'Qh4#'];
      expect(formatLastMove(moves2, 'white')).toBe('2. g4 Qh4#');
    });

    it('formats longer game correctly', () => {
      const moves: AlgebraicNotation[] = [
        'e4',
        'c5',
        'Nf3',
        'd6',
        'd4',
        'cxd4',
        'Nxd4',
        'Nf6',
        'Nc3',
        'a6',
      ];
      expect(formatLastMove(moves, 'white')).toBe('5. Nc3 a6');
    });
  });

  describe('black player perspective', () => {
    it('formats when white made the only move', () => {
      const moves: AlgebraicNotation[] = ['e4'];
      expect(formatLastMove(moves, 'black')).toBe('1. e4');
    });

    it('formats first black move correctly', () => {
      const moves: AlgebraicNotation[] = ['e4', 'e5'];
      expect(formatLastMove(moves, 'black')).toBe('1...e5');
    });

    it('formats when white made second move (after black)', () => {
      const moves: AlgebraicNotation[] = ['e4', 'e5', 'Nf3'];
      expect(formatLastMove(moves, 'black')).toBe('1...e5 2. Nf3');
    });

    it('formats second black move correctly', () => {
      const moves: AlgebraicNotation[] = ['e4', 'e5', 'Nf3', 'Nc6'];
      expect(formatLastMove(moves, 'black')).toBe('2...Nc6');
    });

    it('formats when white made third move (after second black move)', () => {
      const moves: AlgebraicNotation[] = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'];
      expect(formatLastMove(moves, 'black')).toBe('2...Nc6 3. Bc4');
    });

    it('formats third black move correctly', () => {
      const moves: AlgebraicNotation[] = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'];
      expect(formatLastMove(moves, 'black')).toBe('3...Nf6');
    });

    it('formats when white made fourth move (after third black move)', () => {
      const moves: AlgebraicNotation[] = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5'];
      expect(formatLastMove(moves, 'black')).toBe('3...Nf6 4. Ng5');
    });

    it('handles castling moves', () => {
      const moves: AlgebraicNotation[] = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'O-O'];
      expect(formatLastMove(moves, 'black')).toBe('3...O-O');
    });

    it('handles capture moves', () => {
      const moves: AlgebraicNotation[] = ['e4', 'd5', 'exd5', 'Qxd5'];
      expect(formatLastMove(moves, 'black')).toBe('2...Qxd5');
    });

    it('formats longer game correctly', () => {
      const moves: AlgebraicNotation[] = [
        'e4',
        'c5',
        'Nf3',
        'd6',
        'd4',
        'cxd4',
        'Nxd4',
        'Nf6',
        'Nc3',
        'a6',
      ];
      expect(formatLastMove(moves, 'black')).toBe('5...a6');
    });
  });
});
