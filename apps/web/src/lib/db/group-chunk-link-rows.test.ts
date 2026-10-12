import { describe, expect, it } from 'vitest';

import { groupChunkLinkRowsByGame } from './group-chunk-link-rows';

describe('groupChunkLinkRowsByGame', () => {
  it('orders games by their newest link and sorts each game’s moves', () => {
    const rows = [
      { gameId: 'b', ply: 30 },
      { gameId: 'a', ply: 12 },
      { gameId: 'b', ply: 8 },
      { gameId: 'a', ply: 5 },
    ];

    expect(groupChunkLinkRowsByGame(rows, 50)).toEqual([
      { gameId: 'b', plies: [8, 30] },
      { gameId: 'a', plies: [5, 12] },
    ]);
  });

  it('drops a move linked twice in the same game', () => {
    expect(
      groupChunkLinkRowsByGame(
        [
          { gameId: 'a', ply: 7 },
          { gameId: 'a', ply: 7 },
        ],
        50
      )
    ).toEqual([{ gameId: 'a', plies: [7] }]);
  });

  it('limits by games, not by link rows', () => {
    const rows = [
      { gameId: 'a', ply: 1 },
      { gameId: 'a', ply: 2 },
      { gameId: 'a', ply: 3 },
      { gameId: 'b', ply: 1 },
      { gameId: 'c', ply: 1 },
    ];

    expect(groupChunkLinkRowsByGame(rows, 2).map((g) => g.gameId)).toEqual(['a', 'b']);
  });

  it('returns nothing for no links', () => {
    expect(groupChunkLinkRowsByGame([], 50)).toEqual([]);
  });
});
