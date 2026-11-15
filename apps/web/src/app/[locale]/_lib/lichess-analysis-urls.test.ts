import { describe, expect, it } from 'vitest';

import { buildLichessAnalysisUrls, lichessAnalysisUrlsAt } from './lichess-analysis-urls';

const MOVES = ['e4', 'e5', 'Nf3'];
const LATEST = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const build = (currentPosition: number, displayFen: string | null) =>
  buildLichessAnalysisUrls({ moves: MOVES, currentPosition, latestFen: LATEST, displayFen });

const fenUrl = (fen: string) => `https://lichess.org/analysis/${fen.replaceAll(' ', '_')}`;

describe('buildLichessAnalysisUrls', () => {
  it('uses the latest position and opens the game at its last move at -1', () => {
    const urls = build(-1, null);
    expect(urls.position).toBe(fenUrl(LATEST));
    expect(urls.game).toEqual({
      url: 'https://lichess.org/analysis/pgn/e4_e5_Nf3#3',
      includedMoves: 3,
      truncated: false,
      cut: null,
    });
  });

  it('uses the browsed position and opens the game after that move', () => {
    const urls = build(0, AFTER_E4);
    expect(urls.position).toBe(fenUrl(AFTER_E4));
    expect(urls.game.url).toBe('https://lichess.org/analysis/pgn/e4_e5_Nf3#1');
  });

  it('opens the game before its first move at -2', () => {
    const urls = build(-2, START);
    expect(urls.position).toBe(fenUrl(START));
    expect(urls.game.url).toBe('https://lichess.org/analysis/pgn/e4_e5_Nf3#0');
  });

  describe('a game too long for Lichess', () => {
    // 1250 three-letter moves fill the 5000-character path exactly.
    const long = Array.from({ length: 1300 }, (_, i) => ['Nf3', 'Nf6', 'Ng1', 'Ng8'][i % 4]);

    it("names the last move the URL carries and the game's final move", () => {
      const { game } = buildLichessAnalysisUrls({
        moves: long,
        currentPosition: -1,
        latestFen: LATEST,
        displayFen: null,
      });

      expect(game.truncated).toBe(true);
      expect(game.includedMoves).toBe(1250);
      // Ply 1250 (index 1249) is Black's 625th move; ply 1300 is Black's 650th.
      expect(game.cut).toEqual({ lastIncludedMove: '625...Nf6', lastMove: '650...Ng8' });
    });

    it('numbers the last move from a custom start', () => {
      const { game } = buildLichessAnalysisUrls({
        moves: long,
        startingFen: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 10',
        currentPosition: -1,
        latestFen: LATEST,
        displayFen: null,
      });

      // The FEN header uses up room, so fewer moves fit than from the start.
      expect(game.includedMoves).toBeLessThan(1250);
      // Black to move at move 10: index 0 is 10...Nf6, so index i is move 10 + ceil(i / 2).
      const i = game.includedMoves - 1;
      const number = 10 + Math.ceil(i / 2);
      expect(game.cut?.lastIncludedMove).toBe(
        i % 2 === 0 ? `${number}...${long[i]}` : `${number}. ${long[i]}`
      );
    });
  });
});

describe('lichessAnalysisUrlsAt', () => {
  // The puzzle result: the solution sent from the puzzle's own start, opened there.
  it('opens a line from a custom start at its first position', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
    const urls = lichessAnalysisUrlsAt({
      moves: ['Bb5', 'a6'],
      startingFen: fen,
      plies: 0,
      shownFen: fen,
    });

    expect(urls.position).toBe(fenUrl(fen));
    expect(urls.game.url).toBe(
      'https://lichess.org/analysis/pgn/' +
        '%5BFEN_%22r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R_w_KQkq_-_2_3%22%5D_Bb5_a6' +
        '#4'
    );
  });
});
