import type {
  BlindfoldDisplaySettings,
  PieceDisplay,
} from '@blindfold-chess/features/board-display';
import { resolvePieceDisplay } from '@blindfold-chess/features/board-display';
import { fenCharToPiece, fenToBoardFlat } from '@blindfold-chess/features/chess-core/fen';
import { flipIndex, isLightSquare } from '@blindfold-chess/features/common';
import type { SvgElement } from '@blindfold-chess/icons/data';
import { flagData, getPieceData, undoData } from '@blindfold-chess/icons/data';
import type { PieceColor } from '@blindfold-chess/types';
import type { BoardTheme } from '@blindfold-chess/types';
import { boardThemeColors } from '@blindfold-chess/ui';

import type { MoveSquares } from '@/lib/board/move-squares';
import type { TerminationMark } from '@/lib/games/termination-mark';
import { HASH_GLYPH_PATHS, TERMINATION_MARK_STYLE } from '@/lib/games/termination-mark';

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
  lastMove?: MoveSquares | null;
  /** GIF replay annotation (peek/undo badge, rejected-move marker). null/省略で無し */
  overlay?: RenderBoardSvgOverlay | null;
  /**
   * 終局マーク（負けた側のキングのマスに `#` / 白旗のバッジ）。null/省略で無し。
   * どのマスにどちらを描くかは `resolveTerminationMark` が決める — DOM 盤
   * (`ChessBoard`) と同じ判定・同じ配色・同じグリフを使うので、対局画面と
   * GIF で終局の見え方が食い違わない。
   */
  terminationMark?: TerminationMark | null;
};

const DEFAULT_SIZE = 512;
const DEFAULT_THEME: BoardTheme = 'lichess';
const LAST_MOVE_HIGHLIGHT = 'rgba(155,199,0,0.41)';
/** Opacity marking "the player could not see this" — ghosts and faint stones alike. */
const HIDDEN_OPACITY = 0.4;

type Color = PieceColor;

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

/**
 * Maps a (rankFromTop, fileIdx) pair — both 0-based and counted from a8 at
 * (0,0), matching `fenToBoardFlat`'s index order — to the pixel column/row
 * for the requested orientation. White's view keeps a8 top-left (so a1 is
 * bottom-left); black's view rotates 180° (so h8 is bottom-left instead).
 */
function toPixelColRow(rankFromTop: number, fileIdx: number, flipped: boolean) {
  return { col: flipIndex(fileIdx, flipped), row: flipIndex(rankFromTop, flipped) };
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
 * End-of-game badge on the losing king's square: a filled disc tucked into the
 * square's top-right corner, carrying the same stroke glyph the DOM board draws
 * (`#` for a mate, a flag for a resignation).
 *
 * The corner is the square's own, not the board's — unlike the peek / undo
 * badges, this mark has to point at a specific square. It is kept to a third of
 * a square so the king underneath stays readable, and the light ring keeps the
 * disc's silhouette off a same-coloured piece or square.
 */
function terminationMarkMarkup(
  mark: TerminationMark,
  flipped: boolean,
  squareSize: number
): string {
  const { col, row } = squareToColRow(mark.square, flipped);
  const r = squareSize * 0.17;
  const cx = (col + 1) * squareSize - r * 0.8;
  const cy = row * squareSize + r * 0.8;
  const { fill, glyph } = TERMINATION_MARK_STYLE[mark.kind];
  const paths = glyph === 'hash' ? HASH_GLYPH_PATHS : flagData.paths;
  // The shared glyphs are drawn on a 24×24 grid; center that box on the disc.
  const scale = (r * 1.45) / 24;
  const strokeWidth = glyph === 'hash' ? 2.6 : 2.8;

  return (
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ` +
    `stroke="rgba(255,255,255,0.7)" stroke-width="${r * 0.12}"/>` +
    `<g transform="translate(${cx - 12 * scale},${cy - 12 * scale}) scale(${scale})" ` +
    `fill="none" stroke="#ffffff" stroke-width="${strokeWidth}" ` +
    `stroke-linecap="round" stroke-linejoin="round">` +
    paths.map((d) => `<path d="${d}"/>`).join('') +
    `</g>`
  );
}

/**
 * Badge geometry, expressed against a 512px board and scaled from there.
 * A corner badge unavoidably sits on a real square (h8 in white's view) —
 * an 8×8 grid has no free margin — so it is kept well under a square's width
 * (a square is 64 at this size) and tucked toward the very corner, leaving
 * the piece beneath it readable rather than covered.
 */
const BADGE_INSET = 28;
const BADGE_RADIUS = 17;

/**
 * Badge colours. Peek is the quietest of the three annotation colours on
 * purpose: it is by far the most frequent badge (a blindfold player peeks
 * constantly), so a saturated alert colour would read as the subject of the
 * frame rather than a footnote on it. Neutral slate says "meta annotation";
 * the semantic colours stay reserved for the events that are genuinely
 * about the chess — amber for a retracted move, red for a rejected one.
 */
const BADGE_STYLES = {
  peek: { fill: 'rgba(51,65,85,0.55)', accent: '#334155' },
  // Amber keeps more opacity than peek: its glyph is a thin white stroke,
  // which needs the backing to stay legible (peek's is a filled shape).
  undo: { fill: 'rgba(245,158,11,0.9)', accent: '#b45309' },
} as const;

/**
 * Fixed-position badge (top-right corner, independent of orientation) for
 * "a peek happened here" / "this move was undone and redone". A filled
 * circle plus a purely graphical glyph — an eye outline for peek, the shared
 * `undoData` stroke path for undo — never `<text>`.
 */
function badgeMarkup(kind: 'peek' | 'undo', size: number): string {
  const scale = size / 512;
  const cx = size - BADGE_INSET * scale;
  const cy = BADGE_INSET * scale;
  const r = BADGE_RADIUS * scale;
  const { fill, accent } = BADGE_STYLES[kind];
  // A hairline light ring, not decoration: the badge lands on whatever piece
  // occupies the corner square, and a translucent dark fill alone dissolves
  // into a dark piece. The ring keeps the silhouette readable on any
  // background without making the badge louder.
  const circle =
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ` +
    `stroke="rgba(255,255,255,0.55)" stroke-width="${r * 0.1}"/>`;

  if (kind === 'peek') {
    const s = r / 17;
    // The pupil uses the opaque accent, not the translucent badge fill:
    // punching a see-through hole in the white eye would wash it out.
    const glyph =
      `<g transform="translate(${cx},${cy}) scale(${s})">` +
      `<path d="M-14 0 Q0 -11 14 0 Q0 11 -14 0 Z" fill="#ffffff"/>` +
      `<circle cx="0" cy="0" r="4.6" fill="${accent}"/>` +
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
 * and into sharp's rasterizer for GIF export. Deliberately emits no
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
  terminationMark = null,
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
    const isLight = isLightSquare(fileIdx, rankFromTop);
    squaresMarkup += `<rect x="${x}" y="${y}" width="${squareSize}" height="${squareSize}" fill="${
      isLight ? theme.light : theme.dark
    }"/>`;

    const fenChar = board[idx];
    if (!fenChar) continue;
    const piece = fenCharToPiece(fenChar);
    if (!piece) continue;

    const display: PieceDisplay = displaySettings
      ? resolvePieceDisplay(piece, displaySettings)
      : { kind: 'piece', type: piece.type, color: piece.color };

    // Exhaustive over PieceDisplay: an unhandled kind must not fall through
    // to the full-piece branch below — on a blindfold board that leaks the
    // position. The `never` default turns a new kind into a build error.
    switch (display.kind) {
      case 'absent':
        continue;
      case 'circle': {
        if (display.color === 'w') usesStoneWhite = true;
        else usesStoneBlack = true;
        const diameter = squareSize * 0.6;
        // A faint stone is a hidden one — same opacity as a ghost piece, so
        // "dimmed" reads as "the player could not see this" no matter which
        // form the square takes.
        const opacity = display.faint ? ` opacity="${HIDDEN_OPACITY}"` : '';
        piecesMarkup += `<circle cx="${x + squareSize / 2}" cy="${y + squareSize / 2}" r="${
          diameter / 2
        }" fill="url(#bfc-stone-${display.color})"${opacity}/>`;
        continue;
      }
      case 'ghost':
      case 'piece': {
        const pieceData = getPieceData(display.type, display.color);
        const scale = (squareSize * 0.8) / 45;
        const offset = squareSize * 0.1;
        const pieceGroup = `<g transform="translate(${x + offset},${y + offset}) scale(${scale})">${serializeElements(
          pieceData.elements
        )}</g>`;
        piecesMarkup +=
          display.kind === 'ghost'
            ? `<g opacity="${HIDDEN_OPACITY}">${pieceGroup}</g>`
            : pieceGroup;
        continue;
      }
      default: {
        const _exhaustive: never = display;
        void _exhaustive;
        continue;
      }
    }
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
  if (terminationMark) overlayMarkup += terminationMarkMarkup(terminationMark, flipped, squareSize);

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
