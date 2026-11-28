import { describe, expect, it } from 'vitest';

import { parseSessionFens, parseTutorialFen } from './session-params';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const ENDGAME = '4k3/8/8/8/8/8/4P3/4K3 b - - 0 1';

const encode = (lines: string[]) => btoa(lines.join('\n'));

describe('parseSessionFens', () => {
  it('returns every FEN of a list built by the setup screen', () => {
    expect(parseSessionFens(encode([START, ENDGAME]))).toEqual([START, ENDGAME]);
  });

  it('drops the lines that are not FENs and keeps the rest in order', () => {
    expect(parseSessionFens(encode(['garbage', START, '8/8/8/8/8/8/8/17 w', ENDGAME]))).toEqual([
      START,
      ENDGAME,
    ]);
  });

  it('trims each line and skips blank ones', () => {
    expect(parseSessionFens(encode([`  ${START}  `, '', '   ', ENDGAME]))).toEqual([
      START,
      ENDGAME,
    ]);
  });

  it('returns null when no line is a FEN', () => {
    expect(parseSessionFens(encode(['garbage', 'not/a/fen x']))).toBeNull();
  });

  it('returns null for a value that is not Base64', () => {
    expect(parseSessionFens('%%%')).toBeNull();
  });

  it('returns null for a missing, empty or repeated parameter', () => {
    expect(parseSessionFens(undefined)).toBeNull();
    expect(parseSessionFens('')).toBeNull();
    expect(parseSessionFens([encode([START]), encode([ENDGAME])])).toBeNull();
  });
});

describe('parseTutorialFen', () => {
  it('returns the FEN the tutorial sends', () => {
    expect(parseTutorialFen(encodeURIComponent(ENDGAME))).toBe(ENDGAME);
  });

  it('returns null for a value that is not a FEN', () => {
    expect(parseTutorialFen('garbage')).toBeNull();
    expect(parseTutorialFen(encodeURIComponent('8/8/8/8/8/8/8/17 w'))).toBeNull();
  });

  it('returns null for malformed percent-encoding', () => {
    expect(parseTutorialFen('%E0%A4%A')).toBeNull();
  });

  it('returns null for a missing, empty or repeated parameter', () => {
    expect(parseTutorialFen(undefined)).toBeNull();
    expect(parseTutorialFen('')).toBeNull();
    expect(parseTutorialFen([ENDGAME, ENDGAME])).toBeNull();
  });
});
