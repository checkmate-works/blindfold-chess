import type { BlindfoldDisplaySettings } from '@blindfold-chess/features/board-display';
import { describe, expect, it } from 'vitest';

import { renderBoardSvg } from './render-board-svg';

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('renderBoardSvg', () => {
  it('renders all 32 pieces for the initial position', () => {
    const svg = renderBoardSvg({ fen: INITIAL_FEN });
    const pieceGroups = svg.match(/transform="translate/g) ?? [];
    expect(pieceGroups).toHaveLength(32);
  });

  it('flips the same piece to a different pixel position', () => {
    const straight = renderBoardSvg({ fen: INITIAL_FEN, flipped: false });
    const flipped = renderBoardSvg({ fen: INITIAL_FEN, flipped: true });
    const firstTranslate = (svg: string) => svg.match(/transform="translate\(([^)]+)\)/)?.[1];
    expect(firstTranslate(flipped)).not.toBe(firstTranslate(straight));
  });

  it('uses the requested theme hex on the board squares', () => {
    const lichess = renderBoardSvg({ fen: INITIAL_FEN, boardTheme: 'lichess' });
    expect(lichess).toContain('#f0d9b5');
    expect(lichess).toContain('#b58863');

    const chesscom = renderBoardSvg({ fen: INITIAL_FEN, boardTheme: 'chesscom' });
    expect(chesscom).toContain('#eeeed2');
    expect(chesscom).toContain('#769656');
  });

  it('renders hidden pieces as faint ghosts (opacity 0.4)', () => {
    const displaySettings: BlindfoldDisplaySettings = {
      ownColor: 'w',
      showOwnPieces: false,
      showOpponentPieces: true,
      pieceShapeMode: 'normal',
      pieceColors: 'normal',
      pawnHideMode: 'none',
      hiddenPieceStyle: 'ghost',
    };
    const svg = renderBoardSvg({ fen: INITIAL_FEN, displaySettings });
    expect(svg).toContain('opacity="0.4"');
  });

  it('renders obfuscated pieces as Go stones with a radial gradient', () => {
    const displaySettings: BlindfoldDisplaySettings = {
      ownColor: 'w',
      showOwnPieces: true,
      showOpponentPieces: true,
      pieceShapeMode: 'circles-all',
      pieceColors: 'normal',
      pawnHideMode: 'none',
      hiddenPieceStyle: 'ghost',
    };
    const svg = renderBoardSvg({ fen: INITIAL_FEN, displaySettings });
    expect(svg).toContain('<radialGradient');
    expect(svg).toContain('url(#bfc-stone-w)');
    expect(svg).toContain('url(#bfc-stone-b)');
  });

  it('draws two highlight rects for the last move', () => {
    const svg = renderBoardSvg({
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      lastMove: { from: 'e2', to: 'e4' },
    });
    const highlights = svg.match(/rgba\(155,199,0,0\.41\)/g) ?? [];
    expect(highlights).toHaveLength(2);
  });

  it('never emits a <text> element', () => {
    const svg = renderBoardSvg({ fen: INITIAL_FEN });
    expect(svg).not.toContain('<text');
  });
});
