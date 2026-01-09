import { describe, expect, test } from 'vitest';

import { sortMoves } from './move-sorter';

describe('sortMoves', () => {
  test('sorts pawn moves alphabetically', () => {
    const moves = ['b4', 'a3', 'e4', 'a4', 'd4', 'c4'];
    const sorted = sortMoves(moves);
    expect(sorted).toEqual(['a3', 'a4', 'b4', 'c4', 'd4', 'e4']);
  });

  test('sorts pawn captures with regular pawn moves', () => {
    const moves = ['b3', 'bxa3', 'a3', 'a4', 'axb3'];
    const sorted = sortMoves(moves);
    expect(sorted).toEqual(['a3', 'a4', 'axb3', 'b3', 'bxa3']);
  });

  test('sorts knight moves alphabetically', () => {
    const moves = ['Nf3', 'Na3', 'Nc3', 'Nh3'];
    const sorted = sortMoves(moves);
    expect(sorted).toEqual(['Na3', 'Nc3', 'Nf3', 'Nh3']);
  });

  test('sorts knight captures with regular knight moves', () => {
    const moves = ['Nf3', 'Nxd5', 'Nc3', 'Nxe4'];
    const sorted = sortMoves(moves);
    expect(sorted).toEqual(['Nc3', 'Nf3', 'Nxd5', 'Nxe4']);
  });

  test('sorts bishop moves alphabetically', () => {
    const moves = ['Bc4', 'Bb5', 'Bd2', 'Be2'];
    const sorted = sortMoves(moves);
    expect(sorted).toEqual(['Bb5', 'Bc4', 'Bd2', 'Be2']);
  });

  test('sorts rook moves alphabetically', () => {
    const moves = ['Re1', 'Ra1', 'Rd1', 'Rc1'];
    const sorted = sortMoves(moves);
    expect(sorted).toEqual(['Ra1', 'Rc1', 'Rd1', 'Re1']);
  });

  test('sorts queen moves alphabetically', () => {
    const moves = ['Qd2', 'Qa4', 'Qb3', 'Qe2'];
    const sorted = sortMoves(moves);
    expect(sorted).toEqual(['Qa4', 'Qb3', 'Qd2', 'Qe2']);
  });

  test('sorts king moves alphabetically', () => {
    const moves = ['Ke2', 'Kd2', 'Kf2'];
    const sorted = sortMoves(moves);
    expect(sorted).toEqual(['Kd2', 'Ke2', 'Kf2']);
  });

  test('places castling moves at the end', () => {
    const moves = ['Nf3', 'O-O', 'e4', 'O-O-O', 'Bc4'];
    const sorted = sortMoves(moves);
    expect(sorted).toEqual(['e4', 'Nf3', 'Bc4', 'O-O', 'O-O-O']);
  });

  test('sorts moves by piece type priority, then alphabetically', () => {
    const moves = ['Nf3', 'e4', 'Bc4', 'd4', 'Nc3', 'Bb5'];
    const sorted = sortMoves(moves);
    expect(sorted).toEqual(['d4', 'e4', 'Nc3', 'Nf3', 'Bb5', 'Bc4']);
  });

  test('sorts all piece types in correct order', () => {
    const moves = ['Qd2', 'e4', 'Nf3', 'O-O', 'Bc4', 'Re1', 'Kd1', 'd4'];
    const sorted = sortMoves(moves);
    expect(sorted).toEqual(['d4', 'e4', 'Nf3', 'Bc4', 'Re1', 'Qd2', 'Kd1', 'O-O']);
  });

  test('handles moves with check symbols', () => {
    const moves = ['Qh5+', 'e4', 'Nf3+', 'Bc4+'];
    const sorted = sortMoves(moves);
    expect(sorted).toEqual(['e4', 'Nf3+', 'Bc4+', 'Qh5+']);
  });

  test('handles moves with checkmate symbols', () => {
    const moves = ['Qf7#', 'e4', 'Nf7#', 'Bc4'];
    const sorted = sortMoves(moves);
    expect(sorted).toEqual(['e4', 'Nf7#', 'Bc4', 'Qf7#']);
  });

  test('handles moves with disambiguation (e.g., Nbd2)', () => {
    const moves = ['Nfd2', 'Nbd2', 'e4', 'Nf3'];
    const sorted = sortMoves(moves);
    expect(sorted).toEqual(['e4', 'Nbd2', 'Nf3', 'Nfd2']);
  });

  test('handles pawn promotion moves', () => {
    const moves = ['a8=Q', 'e4', 'bxc8=N', 'b7'];
    const sorted = sortMoves(moves);
    expect(sorted).toEqual(['a8=Q', 'b7', 'bxc8=N', 'e4']);
  });

  test('handles complex real game scenario', () => {
    const moves = [
      'Nf3',
      'e4',
      'Bc4',
      'd4',
      'Nc3',
      'Bb5',
      'O-O',
      'exd5',
      'Nxd4',
      'Qd3',
      'Re1+',
      'Bxf7+',
    ];
    const sorted = sortMoves(moves);
    expect(sorted).toEqual([
      'd4',
      'e4',
      'exd5',
      'Nc3',
      'Nf3',
      'Nxd4',
      'Bb5',
      'Bc4',
      'Bxf7+',
      'Re1+',
      'Qd3',
      'O-O',
    ]);
  });

  test('does not mutate original array', () => {
    const moves = ['Nf3', 'e4', 'Bc4'];
    const original = [...moves];
    sortMoves(moves);
    expect(moves).toEqual(original);
  });

  test('handles empty array', () => {
    const moves: string[] = [];
    const sorted = sortMoves(moves);
    expect(sorted).toEqual([]);
  });

  test('handles single move', () => {
    const moves = ['e4'];
    const sorted = sortMoves(moves);
    expect(sorted).toEqual(['e4']);
  });
});
