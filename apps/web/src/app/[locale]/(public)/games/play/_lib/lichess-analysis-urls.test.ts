import { describe, expect, it } from 'vitest';

import { buildLichessAnalysisUrls } from './lichess-analysis-urls';

const MOVES = ['e4', 'e5', 'Nf3'];
const LATEST = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const build = (currentPosition: number, displayFen: string | null) =>
  buildLichessAnalysisUrls({ moves: MOVES, currentPosition, latestFen: LATEST, displayFen });

describe('buildLichessAnalysisUrls', () => {
  it('uses the latest position and opens the game at its last move at -1', () => {
    const urls = build(-1, null);
    expect(urls.position).toBe(`https://lichess.org/analysis/${LATEST.replaceAll(' ', '_')}`);
    expect(urls.game).toBe('https://lichess.org/analysis/pgn/e4_e5_Nf3#3');
  });

  it('uses the browsed position and opens the game after that move', () => {
    const urls = build(0, AFTER_E4);
    expect(urls.position).toBe(`https://lichess.org/analysis/${AFTER_E4.replaceAll(' ', '_')}`);
    expect(urls.game).toBe('https://lichess.org/analysis/pgn/e4_e5_Nf3#1');
  });

  it('opens the game before its first move at -2', () => {
    const urls = build(-2, START);
    expect(urls.position).toBe(`https://lichess.org/analysis/${START.replaceAll(' ', '_')}`);
    expect(urls.game).toBe('https://lichess.org/analysis/pgn/e4_e5_Nf3#0');
  });
});
