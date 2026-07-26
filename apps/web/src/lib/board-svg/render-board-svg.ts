import type {
  BlindfoldDisplaySettings,
  PieceDisplay,
} from '@blindfold-chess/features/board-display';
import { resolvePieceDisplay } from '@blindfold-chess/features/board-display';
import { fenToBoardFlat } from '@blindfold-chess/features/chess-core/fen';
import type { SvgElement } from '@blindfold-chess/icons/data';
import { getPieceData } from '@blindfold-chess/icons/data';
import type { BoardTheme } from '@blindfold-chess/types';
import type { PieceType } from '@blindfold-chess/types';
import { boardThemeColors } from '@blindfold-chess/ui';

export type RenderBoardSvgOptions = {
  fen: string;
  /** 盤の一辺 px。viewBox にのみ影響（SVG はスケール自由） */
  size?: number;
  /** true で黒視点（8段目が下） */
  flipped?: boolean;
  boardTheme?: BoardTheme;
  /** 目隠し "as played" 表示。null/省略で通常表示 */
  displaySettings?: BlindfoldDisplaySettings | null;
  /** 直前の手のハイライト（from/to マス）。null で無し */
  lastMove?: { from: string; to: string } | null;
};

const DEFAULT_SIZE = 512;
const DEFAULT_THEME: BoardTheme = 'lichess';
const LAST_MOVE_HIGHLIGHT = 'rgba(155,199,0,0.41)';

type Color = 'w' | 'b';

/**
 * Go-stone gradient stops, mirrored from `src/lib/games/go-stone-style.ts`'s
 * CSS `radial-gradient(ellipse at 30% 30%, ...)`. That string is a CSS value
 * and can't be fed to an SVG `<radialGradient>` directly, so the same stop
 * colors are re-declared here as an SVG-native gradient (a plain radial
 * gradient rather than an ellipse — the box-shadow depth cue is dropped per
 * spec, only the gradient itself needs to match).
 */
const STONE_GRADIENT_STOPS: Record<Color, readonly [string, string, string]> = {
  w: ['#ffffff', '#e8e8e8', '#d0d0d0'],
  b: ['#4a4a4a', '#2a2a2a', '#1a1a1a'],
};

function parseFenChar(ch: string): { type: PieceType; color: Color } | null {
  const lower = ch.toLowerCase();
  if (!/^[kqrbnp]$/.test(lower)) return null;
  return { type: lower as PieceType, color: ch === lower ? 'b' : 'w' };
}

/**
 * Maps a (rankFromTop, fileIdx) pair — both 0-based and counted from a8 at
 * (0,0), matching `fenToBoardFlat`'s index order — to the pixel column/row
 * for the requested orientation. White's view keeps a8 top-left (so a1 is
 * bottom-left); black's view rotates 180° (so h8 is bottom-left instead).
 */
function toPixelColRow(rankFromTop: number, fileIdx: number, flipped: boolean) {
  return flipped ? { col: 7 - fileIdx, row: 7 - rankFromTop } : { col: fileIdx, row: rankFromTop };
}

function squareToColRow(square: string, flipped: boolean) {
  const fileIdx = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rankFromTop = 8 - Number(square[1]);
  return toPixelColRow(rankFromTop, fileIdx, flipped);
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function attrs(pairs: Record<string, string | undefined>): string {
  return Object.entries(pairs)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([key, value]) => `${key}="${escapeAttr(value)}"`)
    .join(' ');
}

/** Recursively serializes a piece's `SvgElement` tree to raw SVG markup. */
function serializeElements(elements: SvgElement[]): string {
  return elements
    .map((el) => {
      if (el.type === 'path') {
        return `<path ${attrs({
          d: el.d,
          fill: el.fill,
          stroke: el.stroke,
          'stroke-width': el.strokeWidth,
          'stroke-linecap': el.strokeLinecap,
          'stroke-linejoin': el.strokeLinejoin,
          'fill-rule': el.fillRule,
        })}/>`;
      }
      if (el.type === 'circle') {
        return `<circle ${attrs({
          cx: el.cx,
          cy: el.cy,
          r: el.r,
          fill: el.fill,
          stroke: el.stroke,
          'stroke-width': el.strokeWidth,
        })}/>`;
      }
      return `<g ${attrs({
        fill: el.fill,
        'fill-rule': el.fillRule,
        stroke: el.stroke,
        'stroke-linecap': el.strokeLinecap,
        'stroke-linejoin': el.strokeLinejoin,
        'stroke-width': el.strokeWidth,
      })}>${serializeElements(el.children)}</g>`;
    })
    .join('');
}

function stoneGradientDef(color: Color): string {
  const [c0, c50, c100] = STONE_GRADIENT_STOPS[color];
  return (
    `<radialGradient id="bfc-stone-${color}" cx="30%" cy="30%" r="70%">` +
    `<stop offset="0%" stop-color="${c0}"/>` +
    `<stop offset="50%" stop-color="${c50}"/>` +
    `<stop offset="100%" stop-color="${c100}"/>` +
    `</radialGradient>`
  );
}

/**
 * Render a FEN position to a raw SVG string. React-free, DOM-free, chess.js-
 * free pure function — safe to feed directly into `next/og`'s `ImageResponse`
 * (Phase 1) and sharp's rasterizer (Phase 2 GIF export). Deliberately emits no
 * `<text>` elements: the Vercel lambda has no fonts installed, so any text
 * node would render as tofu.
 */
export function renderBoardSvg({
  fen,
  size = DEFAULT_SIZE,
  flipped = false,
  boardTheme = DEFAULT_THEME,
  displaySettings = null,
  lastMove = null,
}: RenderBoardSvgOptions): string {
  const squareSize = size / 8;
  const theme = boardThemeColors[boardTheme];
  const board = fenToBoardFlat(fen);

  let squaresMarkup = '';
  let piecesMarkup = '';
  let usesStoneWhite = false;
  let usesStoneBlack = false;

  for (let idx = 0; idx < 64; idx++) {
    const rankFromTop = Math.floor(idx / 8);
    const fileIdx = idx % 8;
    const { col, row } = toPixelColRow(rankFromTop, fileIdx, flipped);
    const x = col * squareSize;
    const y = row * squareSize;
    const isLight = (rankFromTop + fileIdx) % 2 === 0;
    squaresMarkup += `<rect x="${x}" y="${y}" width="${squareSize}" height="${squareSize}" fill="${
      isLight ? theme.light : theme.dark
    }"/>`;

    const fenChar = board[idx];
    if (!fenChar) continue;
    const piece = parseFenChar(fenChar);
    if (!piece) continue;

    const display: PieceDisplay = displaySettings
      ? resolvePieceDisplay(piece, displaySettings)
      : { kind: 'piece', type: piece.type, color: piece.color };

    if (display.kind === 'absent') continue;

    if (display.kind === 'circle') {
      if (display.color === 'w') usesStoneWhite = true;
      else usesStoneBlack = true;
      const diameter = squareSize * 0.6;
      piecesMarkup += `<circle cx="${x + squareSize / 2}" cy="${y + squareSize / 2}" r="${
        diameter / 2
      }" fill="url(#bfc-stone-${display.color})"/>`;
      continue;
    }

    const pieceData = getPieceData(display.type, display.color);
    const scale = (squareSize * 0.8) / 45;
    const offset = squareSize * 0.1;
    const pieceGroup = `<g transform="translate(${x + offset},${y + offset}) scale(${scale})">${serializeElements(
      pieceData.elements
    )}</g>`;
    piecesMarkup += display.kind === 'ghost' ? `<g opacity="0.4">${pieceGroup}</g>` : pieceGroup;
  }

  let highlightMarkup = '';
  if (lastMove) {
    for (const square of [lastMove.from, lastMove.to]) {
      const { col, row } = squareToColRow(square, flipped);
      highlightMarkup += `<rect x="${col * squareSize}" y="${row * squareSize}" width="${squareSize}" height="${squareSize}" fill="${LAST_MOVE_HIGHLIGHT}"/>`;
    }
  }

  const defsMarkup =
    usesStoneWhite || usesStoneBlack
      ? `<defs>${usesStoneWhite ? stoneGradientDef('w') : ''}${
          usesStoneBlack ? stoneGradientDef('b') : ''
        }</defs>`
      : '';

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    defsMarkup +
    `<g>${squaresMarkup}</g>` +
    `<g>${highlightMarkup}</g>` +
    `<g>${piecesMarkup}</g>` +
    `</svg>`
  );
}
