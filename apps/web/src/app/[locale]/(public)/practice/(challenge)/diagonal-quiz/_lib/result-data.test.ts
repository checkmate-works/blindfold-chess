import { describe, expect, it } from 'vitest';

import { parseDiagonalQuizResults } from './result-data';

const encode = (value: unknown) => encodeURIComponent(JSON.stringify(value));

const answered = {
  s: 'c1',
  c: 0,
  dc: 1,
  ac: 0,
  cd: 'a3-c1',
  ca: 'c1-h6',
  ud: 'a3-c1',
  ua: 'c1-g5',
};
const timedOut = { s: 'e4', c: 0, dc: 0, ac: 0, cd: 'b1-h7', ca: 'a8-h1', t: 1 };

describe('parseDiagonalQuizResults', () => {
  it('expands the minified list the challenge writes', () => {
    expect(parseDiagonalQuizResults(encode([answered, timedOut]))).toEqual([
      {
        square: 'c1',
        isCorrect: false,
        isDiagonalCorrect: true,
        isAntiDiagonalCorrect: false,
        correctDiagonal: 'a3-c1',
        correctAntiDiagonal: 'c1-h6',
        userDiagonal: 'a3-c1',
        userAntiDiagonal: 'c1-g5',
      },
      {
        square: 'e4',
        isCorrect: false,
        isDiagonalCorrect: false,
        isAntiDiagonalCorrect: false,
        correctDiagonal: 'b1-h7',
        correctAntiDiagonal: 'a8-h1',
        timedOut: true,
      },
    ]);
  });

  it.each([null, '', 'not-json', '%E0%A4%A'])(
    'is empty for absent or undecodable data: %j',
    (data) => {
      expect(parseDiagonalQuizResults(data)).toEqual([]);
    }
  );

  it.each([null, 42, 'text', { 0: answered }])(
    'is empty when the payload is not an array: %j',
    (value) => {
      expect(parseDiagonalQuizResults(encode(value))).toEqual([]);
    }
  );

  it('drops entries of the wrong shape and keeps the well-formed ones', () => {
    const { cd: _cd, ...withoutDiagonal } = answered;
    const results = parseDiagonalQuizResults(
      encode([
        null,
        'c1',
        [answered],
        {},
        withoutDiagonal,
        { ...answered, s: 'z9' },
        { ...answered, s: { square: 'c1' } },
        { ...answered, ca: 7 },
        answered,
      ])
    );
    expect(results.map((r) => r.square)).toEqual(['c1']);
  });

  it('leaves out a user answer that is not a string instead of dropping the entry', () => {
    const [result] = parseDiagonalQuizResults(encode([{ ...answered, ud: 1, ua: null }]));
    expect(result).not.toHaveProperty('userDiagonal');
    expect(result).not.toHaveProperty('userAntiDiagonal');
  });
});
