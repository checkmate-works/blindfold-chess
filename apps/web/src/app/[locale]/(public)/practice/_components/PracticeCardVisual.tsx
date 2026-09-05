import type { ReactNode } from 'react';

import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import { computeSquareColor } from '@blindfold-chess/features/common';
import type { Square } from '@blindfold-chess/types';
import { FaArrowRight } from 'react-icons/fa';

import type { BoardAnnotations } from '@/lib/board-annotations/types';
import type { PracticeMenuType } from '@/lib/db/practice-menu-types';
import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/games/board-themes';
import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';

const THEME = getBoardThemeColors(DEFAULT_BOARD_THEME);

/**
 * Every board in a band is this size. 64px is the largest at which
 * `board → board` (Position Memory) still fits a phone-width card, and one
 * size for all of them is what stops the grid reading as thirteen unrelated
 * illustrations.
 */
const BOARD_SIZE = 'size-16';

/** Placement-only positions the bands draw. Complete FENs; `BoardThumbnail` parses the placement. */
const EMPTY_BOARD = '8/8/8/8/8/8/8/8 w - - 0 1';
const SAMPLE_POSITION = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1';

/**
 * The two lines a diagonal-quiz question asks for, crossing at e4. Green is
 * the a1-h8 direction, blue the h1-a8 one — the split the module's own labels
 * make (`diagonalLabel` / `antiDiagonalLabel`).
 */
const E4_DIAGONALS: BoardAnnotations = {
  arrows: [
    { from: 'b1', to: 'h7', color: 'green' },
    { from: 'a8', to: 'h1', color: 'blue' },
  ],
  circles: [],
};

/**
 * Three jumps of a knight's tour, up the middle of the board. They zigzag —
 * right, left, right — because at 64px three jumps in the same direction
 * (a1→b3→d4→f5) merged into one straight line and stopped looking like
 * knight moves at all; and they run through the centre rather than along an
 * edge, where the same zigzag was a squiggle under the bottom rank. Green
 * throughout: these are all the same kind of line, unlike the two diagonals
 * above.
 */
const KNIGHT_TOUR_OPENING: BoardAnnotations = {
  arrows: [
    { from: 'c3', to: 'e4', color: 'green' },
    { from: 'e4', to: 'c5', color: 'green' },
    { from: 'c5', to: 'e6', color: 'green' },
  ],
  circles: [],
};

/**
 * The band under a practice card's title: what the module puts in front of
 * you, and what shape the answer takes.
 *
 * Modelled on the example strip of the mahjong scoring app's practice list,
 * where the strip can show the exact tiles a question deals. A chess module
 * rarely can — most of these are blindfold exercises whose whole point is
 * that no board is shown, so the honest picture of "e4 の対角線は？" is the
 * square name and two empty answer slots, not a diagram. The bands therefore
 * draw the real stimulus: a board only where the module shows one.
 *
 * The band has no fill of its own. The mahjong strip is laid on the deep
 * green of a mahjong table because nearly every one of its examples is a hand
 * of tiles, and the green says "this is the table". Here only five of the
 * thirteen examples show a board, so a tinted strip behind the other eight
 * was a grey slab framing two words of notation — it drew more attention than
 * what it contained. The fixed height stays: it is what keeps two cards side
 * by side the same height, whatever their bands hold.
 *
 * Every band is written in the same vocabulary. A named square is a
 * `SquareTile` in the square's own colour; a square the reader is asked for
 * is the same tile drawn blank, so the answer row is recognisably "the same
 * kind of thing, not filled in yet" rather than a stray `??` in small type. A
 * board is always the same size, and where the question and its answer fit
 * on one line they sit on one line, question on the left — the layout
 * `e2 → e4` reads as. Bands that need two lines put the question above the
 * answer.
 *
 * Nothing here carries text that needs translating — squares, notation, piece
 * glyphs and `??` read the same in every locale, which is why the band can be
 * built once for all four. It is `aria-hidden` for the same reason the
 * mahjong strip is: the title and the module's own page already say what the
 * practice is, and spelling out "e4, question mark" adds nothing.
 */
export function PracticeCardVisual({ menuType }: { menuType: PracticeMenuType }) {
  return (
    <div
      aria-hidden="true"
      className="mt-4 flex h-28 flex-col items-center justify-center gap-2 overflow-hidden px-3"
    >
      <VisualBody menuType={menuType} />
    </div>
  );
}

function VisualBody({ menuType }: { menuType: PracticeMenuType }): ReactNode {
  switch (menuType) {
    // A square name, answered as light or dark — so the two answer slots are
    // the board's own two colours rather than the words for them.
    case 'square_colors':
      return (
        <Row>
          {/* The one square that must NOT be drawn in its own colour — that
              is the answer. With no colour to show it is not a tile at all,
              just the name, the way Algebraic Notation shows its move. */}
          <Notation>e4</Notation>
          <Arrow />
          <Swatch tone="light" />
          <Swatch tone="dark" />
        </Row>
      );

    // The one module that puts the name on the board and asks for the square.
    case 'coordinate_quiz':
      return (
        <div className="relative">
          <BoardThumbnail fen={EMPTY_BOARD} flipped={false} className={BOARD_SIZE} />
          <span className="absolute inset-0 flex items-center justify-center font-mono text-lg font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
            e4
          </span>
        </div>
      );

    case 'legal_moves':
      return (
        <>
          <Row>
            <Piece type="n" />
            <SquareTile label="e2" />
            <Arrow />
            <SquareTile label="e4" />
          </Row>
          <Row>
            <Chip className="bg-success/10 text-success">○</Chip>
            <Chip className="bg-destructive/10 text-destructive">×</Chip>
          </Row>
        </>
      );

    // The question is a bare square name, but the thing being asked about is
    // what a bishop on it sees, and that is a picture. Two lines cross every
    // square, so the answer is two blanks, not one.
    case 'diagonal_quiz':
      return (
        <>
          <Row>
            {/* The bishop is beside the board, not on it: at the size a board
                fits here a piece is six pixels across and disappears under
                the arrows crossing it. */}
            <Piece type="b" />
            <BoardThumbnail
              fen={EMPTY_BOARD}
              flipped={false}
              annotations={E4_DIAGONALS}
              className={BOARD_SIZE}
            />
          </Row>
          <span className="flex items-center gap-3">
            <DiagonalBlank />
            <DiagonalBlank />
          </span>
        </>
      );

    case 'board_symmetry':
      return (
        <Row>
          <SquareTile label="e4" />
          <span className="text-base text-muted-foreground">↔</span>
          <SquareTile label="??" tone="blank" />
        </Row>
      );

    // Answered as a path, so the answer row is a chain of squares rather than
    // the single blank the other square-to-square modules take.
    case 'route_planner':
      return (
        <>
          <Row>
            <Piece type="n" />
            <SquareTile label="e2" />
            <Arrow />
            <SquareTile label="g3" />
          </Row>
          <Row>
            <SquareTile label="??" tone="blank" />
            <Arrow />
            <SquareTile label="??" tone="blank" />
            <Arrow />
            <SquareTile label="??" tone="blank" />
          </Row>
        </>
      );

    case 'quadrant_anchors':
      return (
        <Row>
          <SquareTile label="e4" />
          <Arrow />
          <QuadrantGlyph />
        </Row>
      );

    // Look at a position, then rebuild it on an empty board.
    case 'position_memory':
      return (
        <Row>
          <BoardThumbnail fen={SAMPLE_POSITION} flipped={false} className={BOARD_SIZE} />
          <Arrow />
          <BoardThumbnail fen={EMPTY_BOARD} flipped={false} className={BOARD_SIZE} />
        </Row>
      );

    case 'puzzle':
      return (
        <Row>
          <BoardThumbnail fen={SAMPLE_POSITION} flipped={false} className={BOARD_SIZE} />
          <Arrow />
          <SquareTile label="??" tone="blank" />
        </Row>
      );

    // One knight, every square once. A lone knight over the number 64 said
    // nothing about what the 64 was; the tour's first jumps drawn on the
    // board do, and the count under them is the shape of the goal — how many
    // of the 64 the path has reached. The knight is beside the board, not on
    // it, for the same reason the bishop is on the diagonal card: at this
    // size a piece on the board is a few pixels under the arrows.
    case 'knight_tour':
      return (
        <>
          <Row>
            <Piece type="n" />
            <BoardThumbnail
              fen={EMPTY_BOARD}
              flipped={false}
              annotations={KNIGHT_TOUR_OPENING}
              className={BOARD_SIZE}
            />
          </Row>
          <Row>
            <Notation>4 / 64</Notation>
          </Row>
        </>
      );

    case 'algebraic_notation':
      return (
        <Row>
          <Notation>Nf3</Notation>
          <Arrow />
          <Piece type="n" />
          <SquareTile label="f3" />
        </Row>
      );

    // Read the string, put the board back together.
    case 'fen':
      return (
        <Row>
          <Notation className="max-w-[7.5rem] truncate">r1bqkb1r/pp…</Notation>
          <Arrow />
          <BoardThumbnail fen={SAMPLE_POSITION} flipped={false} className={BOARD_SIZE} />
        </Row>
      );

    // A game replayed a move at a time, so what is shown is the moves so far.
    case 'recall':
      return (
        <Row>
          <Notation>1.e4 e5 2.Nf3</Notation>
          <SquareTile label="??" tone="blank" />
        </Row>
      );

    default: {
      // Exhaustive over PracticeMenuType: a new module has to declare what its
      // card shows, rather than silently drawing an empty band.
      const _exhaustive: never = menuType;
      void _exhaustive;
      return null;
    }
  }
}

function Row({ children }: { children: ReactNode }) {
  return <span className="flex items-center gap-1.5">{children}</span>;
}

/**
 * A square drawn in its own colour, so `e2 → e4` on a card carries the same
 * light/dark information the board would. `blank` is for a square the reader
 * is being asked for — it has no colour yet.
 */
function SquareTile({ label, tone = 'auto' }: { label: string; tone?: 'auto' | 'blank' }) {
  const colorClasses =
    tone === 'blank'
      ? 'border border-dashed border-muted-foreground/70 text-muted-foreground'
      : computeSquareColor(label as Square) === 'light'
        ? `${THEME.light} ${THEME.lightCoordinates}`
        : `${THEME.dark} ${THEME.darkCoordinates}`;

  return (
    <span
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded px-1 font-mono text-xs font-bold ${colorClasses}`}
    >
      {label}
    </span>
  );
}

/** A square-sized block of one board colour: the shape of a "light or dark" answer. */
function Swatch({ tone }: { tone: 'light' | 'dark' }) {
  return (
    <span
      className={`size-7 rounded ${tone === 'light' ? THEME.light : THEME.dark} ring-1 ring-border`}
    />
  );
}

/** A yes/no answer, sized to sit level with a `SquareTile`. */
function Chip({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={`inline-flex h-7 items-center rounded px-2.5 text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}

/** The blank for one diagonal: its two end squares, both still to be named. */
function DiagonalBlank() {
  return (
    <Row>
      <SquareTile label="??" tone="blank" />
      <span className="text-xs text-muted-foreground">–</span>
      <SquareTile label="??" tone="blank" />
    </Row>
  );
}

function Notation({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`font-mono text-sm font-bold text-foreground ${className}`}>{children}</span>
  );
}

/** A piece glyph. `size` defaults to what fits inline beside a square tile. */
function Piece({ type, size = 22 }: { type: 'n' | 'b'; size?: number }) {
  return <ChessPiece type={type} color="w" size={size} />;
}

function Arrow() {
  return <FaArrowRight className="size-3 shrink-0 text-muted-foreground" />;
}

/**
 * The board's four quadrants, with the one holding e4 (kingside, own half)
 * marked — the shape of a quadrant-anchors answer.
 */
function QuadrantGlyph() {
  return (
    <span className="grid grid-cols-2 gap-px">
      {['a', 'b', 'c', 'd'].map((cell) => (
        <span
          key={cell}
          className={`size-3.5 rounded-[2px] ${cell === 'd' ? 'bg-primary' : 'bg-muted-foreground/40'}`}
        />
      ))}
    </span>
  );
}
