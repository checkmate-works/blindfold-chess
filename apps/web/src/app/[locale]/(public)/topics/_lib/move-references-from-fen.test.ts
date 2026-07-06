import { getFenAfterMoves, getStartingFen } from '@blindfold-chess/features/chess-core';
import { describe, expect, test } from 'vitest';

import { parseMoveReferencesFromFen } from './move-references-from-fen';

const START = getStartingFen();

describe('parseMoveReferencesFromFen', () => {
  test('links a legal piece-move opener', () => {
    expect(parseMoveReferencesFromFen('Nf3 is flexible', START)).toEqual([
      { type: 'moveRef', raw: 'Nf3', sans: ['Nf3'] },
      { type: 'text', value: ' is flexible' },
    ]);
  });

  test('does NOT open a run on a bare pawn push (avoids square-name false positives)', () => {
    // e4 is a legal move from the start but a bare pawn push, so it must stay
    // text — chunk comments constantly name squares in prose.
    expect(parseMoveReferencesFromFen('the e4 square is key', START)).toEqual([
      { type: 'text', value: 'the e4 square is key' },
    ]);
  });

  test('absorbs a bare pawn push as a continuation once a run has opened', () => {
    // 1. Nf3 d5 — both legal in sequence; d5 rides along because Nf3 opened.
    expect(parseMoveReferencesFromFen('Nf3 d5 transposes', START)).toEqual([
      { type: 'moveRef', raw: 'Nf3 d5', sans: ['Nf3', 'd5'] },
      { type: 'text', value: ' transposes' },
    ]);
  });

  test('links a pawn-capture opener', () => {
    const fen = getFenAfterMoves(START, ['e4', 'd5']); // white to move, exd5 legal
    expect(parseMoveReferencesFromFen('exd5 opens the center', fen)).toEqual([
      { type: 'moveRef', raw: 'exd5', sans: ['exd5'] },
      { type: 'text', value: ' opens the center' },
    ]);
  });

  test('links castling as an opener', () => {
    const fen = getFenAfterMoves(START, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']);
    expect(parseMoveReferencesFromFen('O-O is safest', fen)).toEqual([
      { type: 'moveRef', raw: 'O-O', sans: ['O-O'] },
      { type: 'text', value: ' is safest' },
    ]);
  });

  test('truncates a run at the first illegal move', () => {
    // Nf3 legal; Qh8 is not reachable next → run stops after Nf3.
    expect(parseMoveReferencesFromFen('Nf3 Qh8 nonsense', START)).toEqual([
      { type: 'moveRef', raw: 'Nf3', sans: ['Nf3'] },
      { type: 'text', value: ' Qh8 nonsense' },
    ]);
  });

  test('drops a move-shaped but illegal opener', () => {
    // Bb5 is not legal from the starting position → plain text.
    expect(parseMoveReferencesFromFen('Bb5 pins nothing yet', START)).toEqual([
      { type: 'text', value: 'Bb5 pins nothing yet' },
    ]);
  });

  test('does not carve a move out of a URL', () => {
    const text = 'see https://example.com/Nf3xyz for more';
    expect(parseMoveReferencesFromFen(text, START)).toEqual([{ type: 'text', value: text }]);
  });

  test('tolerates trailing punctuation after the move', () => {
    expect(parseMoveReferencesFromFen('Best is Nf3.', START)).toEqual([
      { type: 'text', value: 'Best is ' },
      { type: 'moveRef', raw: 'Nf3', sans: ['Nf3'] },
      { type: 'text', value: '.' },
    ]);
  });

  test('links a fused multi-move run and leaves the trailing prose', () => {
    // 1. Nf3 d5 2. d4 — a three-move suggestion from the start.
    expect(parseMoveReferencesFromFen('Try Nf3 d5 d4 for a solid setup', START)).toEqual([
      { type: 'text', value: 'Try ' },
      { type: 'moveRef', raw: 'Nf3 d5 d4', sans: ['Nf3', 'd5', 'd4'] },
      { type: 'text', value: ' for a solid setup' },
    ]);
  });

  test('a plain comment with no move-shaped tokens is a single text segment', () => {
    expect(parseMoveReferencesFromFen('nice pattern, thanks for sharing', START)).toEqual([
      { type: 'text', value: 'nice pattern, thanks for sharing' },
    ]);
  });
});
