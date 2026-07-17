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

  describe('"N." anchored runs', () => {
    test('a "1." anchor lets a bare pawn push open a run', () => {
      expect(parseMoveReferencesFromFen('1. e4 はつまらん', START)).toEqual([
        { type: 'moveRef', raw: '1. e4', sans: ['e4'] },
        { type: 'text', value: ' はつまらん' },
      ]);
    });

    test('glued anchor "1.e4" also opens', () => {
      expect(parseMoveReferencesFromFen('1.e4 boring', START)).toEqual([
        { type: 'moveRef', raw: '1.e4', sans: ['e4'] },
        { type: 'text', value: ' boring' },
      ]);
    });

    test('anchored multi-move run with agreeing interleaved labels', () => {
      expect(parseMoveReferencesFromFen('try 1. e4 e5 2. Nf3 here', START)).toEqual([
        { type: 'text', value: 'try ' },
        { type: 'moveRef', raw: '1. e4 e5 2. Nf3', sans: ['e4', 'e5', 'Nf3'] },
        { type: 'text', value: ' here' },
      ]);
    });

    test('a disagreeing later label ends the run before it', () => {
      // "4." does not name the move the run has reached (2. is due) → the run
      // stops at e5. The label itself stays text (as a fresh anchor it names
      // neither move 1 of the branch nor the FEN's own number); "Nf3" then
      // opens its own base-position run, as any legal move-like token always
      // has.
      expect(parseMoveReferencesFromFen('1. e4 e5 4. Nf3', START)).toEqual([
        { type: 'moveRef', raw: '1. e4 e5', sans: ['e4', 'e5'] },
        { type: 'text', value: ' 4. ' },
        { type: 'moveRef', raw: 'Nf3', sans: ['Nf3'] },
      ]);
    });

    test('an anchor not naming the branch head stays text', () => {
      // From a fresh position only "1." (or the FEN's own number) can open.
      expect(parseMoveReferencesFromFen('3. e4 was better', START)).toEqual([
        { type: 'text', value: '3. e4 was better' },
      ]);
    });

    test('a white-move anchor against a black-to-move position stays text', () => {
      const fen = getFenAfterMoves(START, ['e4']); // black to move
      expect(parseMoveReferencesFromFen('1. e5 equalizes', fen)).toEqual([
        { type: 'text', value: '1. e5 equalizes' },
      ]);
    });

    test('a "1..." anchor opens against a black-to-move position', () => {
      const fen = getFenAfterMoves(START, ['e4']); // black to move
      expect(parseMoveReferencesFromFen('1... e5 equalizes', fen)).toEqual([
        { type: 'moveRef', raw: '1... e5', sans: ['e5'] },
        { type: 'text', value: ' equalizes' },
      ]);
    });

    test("the FEN's own fullmove number is accepted as the branch head label", () => {
      // After 1. e4 e5 the FEN's fullmove is 2 — both "1." (variation
      // convention) and "2." (the position's own clock) may open a run.
      const fen = getFenAfterMoves(START, ['e4', 'e5']);
      expect(parseMoveReferencesFromFen('2. Nf3 develops', fen)).toEqual([
        { type: 'moveRef', raw: '2. Nf3', sans: ['Nf3'] },
        { type: 'text', value: ' develops' },
      ]);
      expect(parseMoveReferencesFromFen('1. Nf3 develops', fen)).toEqual([
        { type: 'moveRef', raw: '1. Nf3', sans: ['Nf3'] },
        { type: 'text', value: ' develops' },
      ]);
    });

    test('an anchored run whose first move is illegal stays text', () => {
      expect(parseMoveReferencesFromFen('1. e5 makes no sense', START)).toEqual([
        { type: 'text', value: '1. e5 makes no sense' },
      ]);
    });

    test('an ordered-list item that is not a move stays text', () => {
      expect(parseMoveReferencesFromFen('1. first idea 2. second idea', START)).toEqual([
        { type: 'text', value: '1. first idea 2. second idea' },
      ]);
    });

    test('does not carve an anchor out of a URL path segment', () => {
      const text = 'see https://example.com/study/abc/1.e4 for more';
      expect(parseMoveReferencesFromFen(text, START)).toEqual([{ type: 'text', value: text }]);
    });
  });

  test('a kingless pattern FEN falls back to plain text without crashing', () => {
    // Chunk representative FENs may legitimately omit kings; chess.js refuses
    // to load such positions, so nothing can be verified — the whole comment
    // must survive as plain text.
    expect(
      parseMoveReferencesFromFen('Rc8 doubles the rooks', '8/r1r5/8/8/8/8/8/8 w - - 0 1')
    ).toEqual([{ type: 'text', value: 'Rc8 doubles the rooks' }]);
  });
});
