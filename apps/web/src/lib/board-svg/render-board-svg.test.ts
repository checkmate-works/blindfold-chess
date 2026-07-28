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

  it('fades a hidden stone instead of flattening it into a ghost piece', () => {
    const displaySettings: BlindfoldDisplaySettings = {
      ownColor: 'w',
      showOwnPieces: false,
      showOpponentPieces: true,
      pieceShapeMode: 'circles-own',
      pieceColors: 'normal',
      pawnHideMode: 'none',
      hiddenPieceStyle: 'ghost',
    };
    const svg = renderBoardSvg({ fen: INITIAL_FEN, displaySettings });
    // White's 16 hidden pieces stay stones, each carrying the hidden opacity.
    const faintStones = svg.match(/url\(#bfc-stone-w\)" opacity="0\.4"/g) ?? [];
    expect(faintStones).toHaveLength(16);
    // Black is visible and normally shaped, so it renders as real pieces.
    expect(svg).not.toContain('url(#bfc-stone-b)');
  });

  it('never emits a <text> element', () => {
    const svg = renderBoardSvg({ fen: INITIAL_FEN });
    expect(svg).not.toContain('<text');
  });

  describe('overlay', () => {
    it('draws a peek badge as a translucent neutral circle with an eye glyph', () => {
      const svg = renderBoardSvg({ fen: INITIAL_FEN, overlay: { badge: 'peek' } });
      expect(svg).toContain('rgba(51,65,85,0.55)');
      expect(svg).not.toContain('<text');
    });

    it('draws an undo badge as a filled amber circle with the undo stroke glyph', () => {
      const svg = renderBoardSvg({ fen: INITIAL_FEN, overlay: { badge: 'undo' } });
      expect(svg).toContain('rgba(245,158,11,0.9)');
      expect(svg).not.toContain('<text');
    });

    it('keeps a badge well inside the corner square so the piece under it stays readable', () => {
      // A 512px board has 64px squares; a badge wider than that would blot out
      // the corner square (h8) entirely rather than annotate over it.
      const svg = renderBoardSvg({ fen: INITIAL_FEN, overlay: { badge: 'peek' } });
      const badge = svg.match(/<circle cx="(\d+)" cy="(\d+)" r="(\d+)"/);
      expect(badge).not.toBeNull();
      const [, cx, cy, r] = badge!.map(Number);
      expect(Number(r) * 2).toBeLessThan(64);
      // Fully inside the board, not clipped by the viewBox edge.
      expect(Number(cx) + Number(r)).toBeLessThanOrEqual(512);
      expect(Number(cy) - Number(r)).toBeGreaterThanOrEqual(0);
    });

    it('draws a red fill + cross on the illegal destination square', () => {
      const svg = renderBoardSvg({ fen: INITIAL_FEN, overlay: { illegalTo: 'e4' } });
      expect(svg).toContain('rgba(220,38,38,0.42)');
      const crossPaths = svg.match(/stroke="#dc2626"/g) ?? [];
      expect(crossPaths.length).toBeGreaterThanOrEqual(2);
    });

    it('draws a red outline on the illegal origin square, distinct from the destination fill', () => {
      const svg = renderBoardSvg({
        fen: INITIAL_FEN,
        overlay: { illegalTo: 'e4', illegalFrom: 'e2' },
      });
      expect(svg).toContain('fill="none" stroke="#dc2626"');
      expect(svg).toContain('rgba(220,38,38,0.42)');
    });

    it('draws the illegal-destination marker after the piece layer so it stays visible over an occupied square', () => {
      const svg = renderBoardSvg({ fen: INITIAL_FEN, overlay: { illegalTo: 'a8' } });
      const illegalIdx = svg.indexOf('rgba(220,38,38,0.42)');
      const lastPieceIdx = svg.lastIndexOf('transform="translate');
      expect(illegalIdx).toBeGreaterThan(lastPieceIdx);
    });

    it('renders no overlay markup when omitted', () => {
      const withOverlay = renderBoardSvg({ fen: INITIAL_FEN, overlay: { badge: 'peek' } });
      const without = renderBoardSvg({ fen: INITIAL_FEN });
      expect(without).not.toContain('rgba(14,165,233,0.92)');
      expect(withOverlay).not.toBe(without);
    });

    it('still never emits a <text> element with every overlay kind combined', () => {
      const svg = renderBoardSvg({
        fen: INITIAL_FEN,
        overlay: { badge: 'undo', illegalTo: 'e4', illegalFrom: 'e2' },
      });
      expect(svg).not.toContain('<text');
    });
  });
});
