import type { ReactNode } from 'react';

import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import { computeSquareColor } from '@blindfold-chess/features/common';
import type { Square } from '@blindfold-chess/types';
import { FaArrowRight } from 'react-icons/fa';

import type { PracticeMenuType } from '@/lib/db/practice-menu-types';
import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/games/board-themes';
import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';

const THEME = getBoardThemeColors(DEFAULT_BOARD_THEME);

/** Placement-only positions the bands draw. Complete FENs; `BoardThumbnail` parses the placement. */
const EMPTY_BOARD = '8/8/8/8/8/8/8/8 w - - 0 1';
const SAMPLE_POSITION = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1';
const LONE_KNIGHT = '8/8/8/8/4N3/8/8/8 w - - 0 1';

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
 * what it contained. The fixed height stays: it is what keeps the "View
 * details" rows of two cards side by side in line with each other.
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
      className="mt-4 flex h-24 flex-col items-center justify-center gap-1.5 overflow-hidden px-3"
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
        <>
          <Row>
            {/* The one module whose square must NOT be drawn in its own
                colour — that is the answer. */}
            <SquareTile label="e4" tone="plain" />
          </Row>
          <Row>
            <Swatch tone="light" />
            <Swatch tone="dark" />
          </Row>
        </>
      );

    // The one module that puts the name on the board and asks for the square.
    case 'coordinate_quiz':
      return (
        <div className="relative">
          <BoardThumbnail fen={EMPTY_BOARD} flipped={false} className="size-20" />
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

    // Two lines cross every square, so the answer is two blanks, not one.
    case 'diagonal_quiz':
      return (
        <>
          <Row>
            <SquareTile label="e4" />
          </Row>
          {/* Two lines cross a square, so two answers are wanted — spaced
              apart so the pair does not read as one long blank. */}
          <span className="flex items-center gap-3">
            <Blank>??–??</Blank>
            <Blank>??–??</Blank>
          </span>
        </>
      );

    case 'board_symmetry':
      return (
        <Row>
          <SquareTile label="e4" />
          <span className="text-sm text-muted-foreground">↔</span>
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
            <Blank>?? → ?? → ??</Blank>
          </Row>
        </>
      );

    case 'quadrant_anchors':
      return (
        <>
          <Row>
            <SquareTile label="e4" />
          </Row>
          <Row>
            <QuadrantGlyph />
          </Row>
        </>
      );

    // Look at a position, then rebuild it on an empty board.
    case 'position_memory':
      return (
        <Row>
          <BoardThumbnail fen={SAMPLE_POSITION} flipped={false} className="size-16" />
          <Arrow />
          <BoardThumbnail fen={EMPTY_BOARD} flipped={false} className="size-16" />
        </Row>
      );

    case 'puzzle':
      return (
        <Row>
          <BoardThumbnail fen={SAMPLE_POSITION} flipped={false} className="size-20" />
          <Arrow />
          <SquareTile label="??" tone="blank" />
        </Row>
      );

    // One knight, every square once — hence the count as the answer.
    case 'knight_tour':
      return (
        <Row>
          <BoardThumbnail fen={LONE_KNIGHT} flipped={false} className="size-20" />
          <Arrow />
          <span className="font-mono text-lg font-bold text-foreground">64</span>
        </Row>
      );

    case 'algebraic_notation':
      return (
        <>
          <Row>
            <Notation>Nf3</Notation>
          </Row>
          <Row>
            <Piece type="n" />
            <SquareTile label="f3" />
          </Row>
        </>
      );

    // Read the string, put the board back together.
    case 'fen':
      return (
        <Row>
          <Notation className="max-w-[7.5rem] truncate">r1bqkb1r/pp…</Notation>
          <Arrow />
          <BoardThumbnail fen={SAMPLE_POSITION} flipped={false} className="size-20" />
        </Row>
      );

    // A game replayed a move at a time, so what is shown is the moves so far.
    case 'recall':
      return (
        <>
          <Row>
            <Notation>1.e4 e5 2.Nf3</Notation>
          </Row>
          <Row>
            <Blank>??</Blank>
          </Row>
        </>
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
function SquareTile({
  label,
  tone = 'auto',
}: {
  label: string;
  tone?: 'auto' | 'plain' | 'blank';
}) {
  const colorClasses =
    tone === 'blank'
      ? 'border border-dashed border-muted-foreground/50 text-muted-foreground'
      : tone === 'plain'
        ? 'bg-muted text-foreground'
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

function Swatch({ tone }: { tone: 'light' | 'dark' }) {
  return (
    <span
      className={`size-5 rounded-sm ${tone === 'light' ? THEME.light : THEME.dark} ring-1 ring-black/10`}
    />
  );
}

function Chip({ children, className }: { children: ReactNode; className: string }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-bold ${className}`}>{children}</span>;
}

function Blank({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[11px] text-muted-foreground">{children}</span>;
}

function Notation({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`font-mono text-sm font-bold text-foreground ${className}`}>{children}</span>
  );
}

function Piece({ type }: { type: 'n' }) {
  return <ChessPiece type={type} color="w" size={22} />;
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
          className={`size-4 rounded-[2px] ${cell === 'd' ? 'bg-primary' : 'bg-muted-foreground/25'}`}
        />
      ))}
    </span>
  );
}
