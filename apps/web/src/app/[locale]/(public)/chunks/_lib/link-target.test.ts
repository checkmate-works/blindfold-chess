import { describe, expect, it } from 'vitest';

import { isChunkLinkTarget, parseChunkLinkTarget } from './link-target';

const GAME_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

describe('parseChunkLinkTarget', () => {
  it('accepts a well-formed pair', () => {
    expect(parseChunkLinkTarget(GAME_ID, '16')).toEqual({ gameId: GAME_ID, ply: 16 });
  });

  // ply 0 is the game's first move, not "no move".
  it('accepts ply 0', () => {
    expect(parseChunkLinkTarget(GAME_ID, '0')).toEqual({ gameId: GAME_ID, ply: 0 });
  });

  // Half a pair cannot address a `game_chunks` row, so it is no pair at all.
  it.each([
    ['missing ply', GAME_ID, undefined],
    ['missing game', undefined, '16'],
    ['both missing', undefined, undefined],
  ])('rejects a half-present pair (%s)', (_label, game, ply) => {
    expect(parseChunkLinkTarget(game, ply)).toBeUndefined();
  });

  // Repeated params arrive as arrays; treat them as malformed rather than
  // silently picking one.
  it('rejects repeated params', () => {
    expect(parseChunkLinkTarget([GAME_ID, GAME_ID], '16')).toBeUndefined();
    expect(parseChunkLinkTarget(GAME_ID, ['1', '2'])).toBeUndefined();
  });

  it('rejects a non-uuid game', () => {
    expect(parseChunkLinkTarget('not-a-uuid', '16')).toBeUndefined();
  });

  // Each of these coerces to a number under some parser: `parseInt('3abc')`
  // is 3, `Number('')` and `Number(' ')` are 0, `Number('1e3')` is 1000. All
  // would anchor a link to a move the caller never named.
  it.each([
    '3abc',
    '3.7',
    '',
    ' ',
    ' 16',
    '+16',
    '-1',
    'NaN',
    'Infinity',
    '1e3',
    '0x10',
    '9007199254740993',
  ])('rejects a ply that is not a plain non-negative integer (%s)', (ply) => {
    expect(parseChunkLinkTarget(GAME_ID, ply)).toBeUndefined();
  });
});

describe('isChunkLinkTarget', () => {
  it('accepts the shape it round-trips through sessionStorage', () => {
    expect(isChunkLinkTarget({ gameId: GAME_ID, ply: 16 })).toBe(true);
    expect(isChunkLinkTarget({ gameId: GAME_ID, ply: 0 })).toBe(true);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', GAME_ID],
    ['a non-uuid game', { gameId: 'nope', ply: 1 }],
    ['a stringified ply', { gameId: GAME_ID, ply: '1' }],
    ['a fractional ply', { gameId: GAME_ID, ply: 1.5 }],
    ['a negative ply', { gameId: GAME_ID, ply: -1 }],
    ['a missing ply', { gameId: GAME_ID }],
  ])('rejects %s', (_label, value) => {
    expect(isChunkLinkTarget(value)).toBe(false);
  });
});
