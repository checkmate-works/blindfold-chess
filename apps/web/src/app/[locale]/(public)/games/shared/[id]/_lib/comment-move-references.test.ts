import { getFenAfterMoves, getStartingFen } from '@blindfold-chess/features/chess-core';
import { describe, expect, test } from 'vitest';

import { computeMoveNumber } from '@/app/[locale]/(public)/practice/(free-play)/recall/_lib/compute-move-number';

import { parseCommentMoveReferences, plyFromMoveNumber } from './comment-move-references';

/** Expected `baseFen` for a segment: the real game replayed up to `basePly`. */
function fenBefore(moves: string[], basePly: number, startingFen: string | null = null): string {
  return getFenAfterMoves(startingFen ?? getStartingFen(), moves.slice(0, basePly));
}

describe('plyFromMoveNumber', () => {
  test('round-trips with computeMoveNumber for every ply, starting as white', () => {
    for (let ply = 0; ply < 20; ply++) {
      const { moveNumber, isWhiteMove } = computeMoveNumber(ply, false, 1);
      expect(plyFromMoveNumber(moveNumber, isWhiteMove, false, 1)).toBe(ply);
    }
  });

  test('round-trips with computeMoveNumber for every ply, starting as black', () => {
    for (let ply = 0; ply < 20; ply++) {
      const { moveNumber, isWhiteMove } = computeMoveNumber(ply, true, 1);
      expect(plyFromMoveNumber(moveNumber, isWhiteMove, true, 1)).toBe(ply);
    }
  });

  test('round-trips with a non-default startMoveNumber', () => {
    for (let ply = 0; ply < 20; ply++) {
      const { moveNumber, isWhiteMove } = computeMoveNumber(ply, false, 7);
      expect(plyFromMoveNumber(moveNumber, isWhiteMove, false, 7)).toBe(ply);
    }
  });

  test('returns -1 for a combination that cannot occur', () => {
    // Starting as black, there is no white move numbered `startMoveNumber`.
    expect(plyFromMoveNumber(1, true, true, 1)).toBe(-1);
  });
});

describe('parseCommentMoveReferences', () => {
  // 1. e4 e5 2. Nf3 Nc6 3. Bb5 (Ruy Lopez)
  const RUY_LOPEZ = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'];

  // 1. d4 e6 2. Nd2 Be7 3. e4 c5 4. c3 a5 5. Ngf3 cxd4 6. cxd4 Na6 7. a3 b6 8. Bb5
  const FEATURE_REQUEST_GAME = [
    'd4',
    'e6',
    'Nd2',
    'Be7',
    'e4',
    'c5',
    'c3',
    'a5',
    'Ngf3',
    'cxd4',
    'cxd4',
    'Na6',
    'a3',
    'b6',
    'Bb5',
  ];

  test('links a single white-move reference matching the actual game move', () => {
    const segments = parseCommentMoveReferences('3. Bb5 is the main line', RUY_LOPEZ, null);
    expect(segments).toEqual([
      {
        type: 'moveRef',
        raw: '3. Bb5',
        basePly: 4,
        sans: ['Bb5'],
        baseFen: fenBefore(RUY_LOPEZ, 4),
      },
      { type: 'text', value: ' is the main line' },
    ]);
  });

  test('links a suggested alternative that diverges from the actual game move', () => {
    const segments = parseCommentMoveReferences('3. Bc4 is also playable', RUY_LOPEZ, null);
    expect(segments).toEqual([
      {
        type: 'moveRef',
        raw: '3. Bc4',
        basePly: 4,
        sans: ['Bc4'],
        baseFen: fenBefore(RUY_LOPEZ, 4),
      },
      { type: 'text', value: ' is also playable' },
    ]);
  });

  test('links a black-move reference written with three dots', () => {
    const segments = parseCommentMoveReferences('2...Nf6 avoids the main line', RUY_LOPEZ, null);
    expect(segments).toEqual([
      {
        type: 'moveRef',
        raw: '2...Nf6',
        basePly: 3,
        sans: ['Nf6'],
        baseFen: fenBefore(RUY_LOPEZ, 3),
      },
      { type: 'text', value: ' avoids the main line' },
    ]);
  });

  test('fuses consecutive moves into a single reference, extending past the recorded game', () => {
    const segments = parseCommentMoveReferences(
      '3. Bb5 a6 4. Ba4 keeps the tension',
      RUY_LOPEZ,
      null
    );
    expect(segments).toEqual([
      {
        type: 'moveRef',
        raw: '3. Bb5 a6 4. Ba4',
        basePly: 4,
        sans: ['Bb5', 'a6', 'Ba4'],
        baseFen: fenBefore(RUY_LOPEZ, 4),
      },
      { type: 'text', value: ' keeps the tension' },
    ]);
  });

  test('truncates at the first illegal move in a run', () => {
    const segments = parseCommentMoveReferences(
      '3. Bb5 Qxd8 is not a real threat',
      RUY_LOPEZ,
      null
    );
    expect(segments).toEqual([
      {
        type: 'moveRef',
        raw: '3. Bb5',
        basePly: 4,
        sans: ['Bb5'],
        baseFen: fenBefore(RUY_LOPEZ, 4),
      },
      { type: 'text', value: ' Qxd8 is not a real threat' },
    ]);
  });

  test('drops the reference entirely when the first move is illegal', () => {
    const segments = parseCommentMoveReferences('3. Qxd8 would be nice', RUY_LOPEZ, null);
    expect(segments).toEqual([{ type: 'text', value: '3. Qxd8 would be nice' }]);
  });

  test('leaves a move number beyond the recorded game as plain text', () => {
    const segments = parseCommentMoveReferences('50. Qh8# was the point', RUY_LOPEZ, null);
    expect(segments).toEqual([{ type: 'text', value: '50. Qh8# was the point' }]);
  });

  test('does not misdetect ordinary prose containing digits and periods', () => {
    const text = 'We finished around 3. hours later, amazing game';
    expect(parseCommentMoveReferences(text, RUY_LOPEZ, null)).toEqual([
      { type: 'text', value: text },
    ]);
  });

  test('never carves a reference out of the middle of a URL', () => {
    // "3.Bc4" is a valid in-range reference on its own — only the word-start
    // guard keeps it inside the URL here.
    const text = 'see https://lichess.org/study/abc/3.Bc4 for the idea';
    expect(parseCommentMoveReferences(text, RUY_LOPEZ, null)).toEqual([
      { type: 'text', value: text },
    ]);
  });

  test('never carves a reference out of the middle of a word', () => {
    // "3. Bb5" matches the actual game — only the word-start guard keeps the
    // glued "x3." from anchoring a run.
    const text = 'chapter x3. Bb5 covers this';
    expect(parseCommentMoveReferences(text, RUY_LOPEZ, null)).toEqual([
      { type: 'text', value: text },
    ]);
  });

  test('links a reference that opens right after a bracket', () => {
    const segments = parseCommentMoveReferences('(3. Bc4 is also playable', RUY_LOPEZ, null);
    expect(segments).toEqual([
      { type: 'text', value: '(' },
      {
        type: 'moveRef',
        raw: '3. Bc4',
        basePly: 4,
        sans: ['Bc4'],
        baseFen: fenBefore(RUY_LOPEZ, 4),
      },
      { type: 'text', value: ' is also playable' },
    ]);
  });

  test('stops a fused run at an interleaved label that names a different move', () => {
    // "15." cannot be move 9 (the ply the run has reached), so the run must
    // not absorb O-O; move 15 is beyond the recorded game, so it stays text.
    const segments = parseCommentMoveReferences(
      '8. Bd3 Bb7 15. O-O was the plan',
      FEATURE_REQUEST_GAME,
      null
    );
    expect(segments).toEqual([
      {
        type: 'moveRef',
        raw: '8. Bd3 Bb7',
        basePly: 14,
        sans: ['Bd3', 'Bb7'],
        baseFen: fenBefore(FEATURE_REQUEST_GAME, 14),
      },
      { type: 'text', value: ' 15. O-O was the plan' },
    ]);
  });

  test('splits two adjacent references instead of fusing across a disagreeing label', () => {
    const segments = parseCommentMoveReferences('3. Bb5 a6 2. Nf3 earlier', RUY_LOPEZ, null);
    expect(segments).toEqual([
      {
        type: 'moveRef',
        raw: '3. Bb5 a6',
        basePly: 4,
        sans: ['Bb5', 'a6'],
        baseFen: fenBefore(RUY_LOPEZ, 4),
      },
      { type: 'text', value: ' ' },
      {
        type: 'moveRef',
        raw: '2. Nf3',
        basePly: 2,
        sans: ['Nf3'],
        baseFen: fenBefore(RUY_LOPEZ, 2),
      },
      { type: 'text', value: ' earlier' },
    ]);
  });

  test('keeps fusing across an interleaved label that agrees with the run', () => {
    const segments = parseCommentMoveReferences(
      '8. Bd3 8...Bb7 stays solid',
      FEATURE_REQUEST_GAME,
      null
    );
    expect(segments).toEqual([
      {
        type: 'moveRef',
        raw: '8. Bd3 8...Bb7',
        basePly: 14,
        sans: ['Bd3', 'Bb7'],
        baseFen: fenBefore(FEATURE_REQUEST_GAME, 14),
      },
      { type: 'text', value: ' stays solid' },
    ]);
  });

  test('links a reference annotated with an evaluation glyph', () => {
    const segments = parseCommentMoveReferences('8. Bd3! is better', FEATURE_REQUEST_GAME, null);
    expect(segments).toEqual([
      {
        type: 'moveRef',
        raw: '8. Bd3',
        basePly: 14,
        sans: ['Bd3'],
        baseFen: fenBefore(FEATURE_REQUEST_GAME, 14),
      },
      { type: 'text', value: '! is better' },
    ]);
  });

  test('links a reference that ends a sentence', () => {
    const segments = parseCommentMoveReferences('I prefer 3. Bc4.', RUY_LOPEZ, null);
    expect(segments).toEqual([
      { type: 'text', value: 'I prefer ' },
      {
        type: 'moveRef',
        raw: '3. Bc4',
        basePly: 4,
        sans: ['Bc4'],
        baseFen: fenBefore(RUY_LOPEZ, 4),
      },
      { type: 'text', value: '.' },
    ]);
  });

  test('links a parenthesized reference', () => {
    const segments = parseCommentMoveReferences('(3. Bc4) is playable too', RUY_LOPEZ, null);
    expect(segments).toEqual([
      { type: 'text', value: '(' },
      {
        type: 'moveRef',
        raw: '3. Bc4',
        basePly: 4,
        sans: ['Bc4'],
        baseFen: fenBefore(RUY_LOPEZ, 4),
      },
      { type: 'text', value: ') is playable too' },
    ]);
  });

  test('keeps trailing punctuation out of a fused run and its linked range', () => {
    const segments = parseCommentMoveReferences('3. Bb5 a6. A solid setup', RUY_LOPEZ, null);
    expect(segments).toEqual([
      {
        type: 'moveRef',
        raw: '3. Bb5 a6',
        basePly: 4,
        sans: ['Bb5', 'a6'],
        baseFen: fenBefore(RUY_LOPEZ, 4),
      },
      { type: 'text', value: '. A solid setup' },
    ]);
  });

  test('reads a zero-padded move number as the same white-move reference', () => {
    const segments = parseCommentMoveReferences('08. Bd3 is better', FEATURE_REQUEST_GAME, null);
    expect(segments).toEqual([
      {
        type: 'moveRef',
        raw: '08. Bd3',
        basePly: 14,
        sans: ['Bd3'],
        baseFen: fenBefore(FEATURE_REQUEST_GAME, 14),
      },
      { type: 'text', value: ' is better' },
    ]);
  });

  test('handles a game with a custom starting FEN (black to move first)', () => {
    // Custom start right after 1. e4 (black to move, fullmove 1); the
    // recorded moves begin with black's reply.
    const startingFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const moves = ['e5', 'Nf3', 'Nc6'];

    expect(parseCommentMoveReferences('1...e5 is symmetric', moves, startingFen)).toEqual([
      {
        type: 'moveRef',
        raw: '1...e5',
        basePly: 0,
        sans: ['e5'],
        baseFen: fenBefore(moves, 0, startingFen),
      },
      { type: 'text', value: ' is symmetric' },
    ]);
    expect(parseCommentMoveReferences('2. Nf3 develops', moves, startingFen)).toEqual([
      {
        type: 'moveRef',
        raw: '2. Nf3',
        basePly: 1,
        sans: ['Nf3'],
        baseFen: fenBefore(moves, 1, startingFen),
      },
      { type: 'text', value: ' develops' },
    ]);
  });

  test('the example from the feature request: a suggested alternative to the actual 8th move', () => {
    const segments = parseCommentMoveReferences('8. Bd3 is better', FEATURE_REQUEST_GAME, null);
    expect(segments).toEqual([
      {
        type: 'moveRef',
        raw: '8. Bd3',
        basePly: 14,
        sans: ['Bd3'],
        baseFen: fenBefore(FEATURE_REQUEST_GAME, 14),
      },
      { type: 'text', value: ' is better' },
    ]);
  });
});
