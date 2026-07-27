import type {
  BlindfoldDisplaySettings,
  PieceDisplay,
} from '@blindfold-chess/features/board-display';
import { resolvePieceDisplay } from '@blindfold-chess/features/board-display';
import { fenToBoardFlat } from '@blindfold-chess/features/chess-core/fen';
import type { SvgElement } from '@blindfold-chess/icons/data';
import { getPieceData, undoData } from '@blindfold-chess/icons/data';
import type { BoardTheme } from '@blindfold-chess/types';
import type { PieceType } from '@blindfold-chess/types';
import { boardThemeColors } from '@blindfold-chess/ui';

/**
 * A GIF-replay annotation drawn on top of the board — a fixed-position badge
 * (blindfold peek / undo), and/or a rejected move marked on its square(s).
 * Purely graphical (rect / path / circle), like the rest of this module: no
 * `<text>`, since the render target has no fonts installed.
 */
export type RenderBoardSvgOverlay = {
  badge?: 'peek' | 'undo';
  /** The rejected move's destination square (algebraic). Red fill + a cross. */
  illegalTo?: string;
  /** The rejected move's origin square, when recoverable. Red outline only. */
  illegalFrom?: string;
};

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
  /** GIF replay annotation (peek/undo badge, rejected-move marker). null/省略で無し */
  overlay?: RenderBoardSvgOverlay | null;
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

/** rgba red used for every illegal-attempt marker — the "rejected" register. */
const ILLEGAL_RED = '#dc2626';

/**
 * The rejected move's destination square: a translucent red fill (drawn
 * after the piece layer, so a self-capture / occupied-square attempt still
 * shows the ✗ on top of the piece) plus a red ✗ built from two `<path>`
 * strokes rather than `<text>`.
 */
function illegalToMarkup(square: string, flipped: boolean, squareSize: number): string {
  const { col, row } = squareToColRow(square, flipped);
  const x = col * squareSize;
  const y = row * squareSize;
  const inset = squareSize * 0.22;
  const cx = x + squareSize / 2;
  const cy = y + squareSize / 2;
  const r = squareSize / 2 - inset;
  const strokeWidth = squareSize * 0.11;
  return (
    `<rect x="${x}" y="${y}" width="${squareSize}" height="${squareSize}" fill="rgba(220,38,38,0.42)"/>` +
    `<path d="M${cx - r} ${cy - r} L${cx + r} ${cy + r}" stroke="${ILLEGAL_RED}" stroke-width="${strokeWidth}" stroke-linecap="round"/>` +
    `<path d="M${cx + r} ${cy - r} L${cx - r} ${cy + r}" stroke="${ILLEGAL_RED}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`
  );
}

/** The rejected move's origin square, when recoverable: a red outline only. */
function illegalFromMarkup(square: string, flipped: boolean, squareSize: number): string {
  const { col, row } = squareToColRow(square, flipped);
  const strokeWidth = squareSize * 0.08;
  const x = col * squareSize + strokeWidth / 2;
  const y = row * squareSize + strokeWidth / 2;
  const side = squareSize - strokeWidth;
  return `<rect x="${x}" y="${y}" width="${side}" height="${side}" fill="none" stroke="${ILLEGAL_RED}" stroke-width="${strokeWidth}"/>`;
}

/**
 * Fixed-position badge (top-right corner, independent of orientation) for
 * "a peek happened here" / "this move was undone and redone". A filled
 * circle plus a purely graphical glyph — an eye outline for peek, the shared
 * `undoData` stroke path for undo — never `<text>`.
 */
function badgeMarkup(kind: 'peek' | 'undo', size: number): string {
  const scale = size / 512;
  const cx = size - 40 * scale;
  const cy = 40 * scale;
  const r = 26 * scale;
  const fill = kind === 'peek' ? 'rgba(14,165,233,0.92)' : 'rgba(245,158,11,0.92)';
  const circle = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;

  if (kind === 'peek') {
    const s = r / 17;
    const glyph =
      `<g transform="translate(${cx},${cy}) scale(${s})">` +
      `<path d="M-14 0 Q0 -11 14 0 Q0 11 -14 0 Z" fill="#ffffff"/>` +
      `<circle cx="0" cy="0" r="4.6" fill="${fill}"/>` +
      `</g>`;
    return circle + glyph;
  }

  const s = r / 13;
  const glyph =
    `<g transform="translate(${cx - 12 * s},${cy - 12 * s}) scale(${s})">` +
    `<path d="${undoData.paths[0]}" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</g>`;
  return circle + glyph;
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
  overlay = null,
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

  // Drawn after the piece layer: illegalTo's ✗ must stay visible over a piece
  // on the target square (self-capture / occupied-square attempts), and the
  // badge is a fixed-position overlay independent of board content either way.
  let overlayMarkup = '';
  if (overlay?.illegalTo) overlayMarkup += illegalToMarkup(overlay.illegalTo, flipped, squareSize);
  if (overlay?.illegalFrom)
    overlayMarkup += illegalFromMarkup(overlay.illegalFrom, flipped, squareSize);
  if (overlay?.badge) overlayMarkup += badgeMarkup(overlay.badge, size);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    defsMarkup +
    `<g>${squaresMarkup}</g>` +
    `<g>${highlightMarkup}</g>` +
    `<g>${piecesMarkup}</g>` +
    `<g>${overlayMarkup}</g>` +
    `</svg>`
  );
}
