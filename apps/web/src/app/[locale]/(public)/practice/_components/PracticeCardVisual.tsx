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
 * `SAMPLE_POSITION` part-way through being rebuilt from memory: kings, pawns
 * and one bishop placed, the rest still to come. An empty board on the right
 * of the Position Memory card said "then you get an empty board", which is
 * true but is not the task; a half-rebuilt one says "then you put it back".
 */
const PARTIALLY_REBUILT_POSITION = '4k3/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/4K3 w - - 0 1';

/**
 * The position before Scholar's Mate — 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? — the
 * one puzzle position a reader is likeliest to know the answer to on sight.
 * The card draws the answer on it (`SCHOLARS_MATE_ANSWER`, Qxf7#).
 */
const SCHOLARS_MATE_POSITION =
  'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';

const SCHOLARS_MATE_ANSWER: BoardAnnotations = {
  arrows: [{ from: 'h5', to: 'f7', color: 'green' }],
  circles: [],
};

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
 * A route-planner answer: the knight's two-jump path from e2 to f5. Two
 * jumps, not one — the module asks for the squares in between, and a
 * one-jump route (e2→g3) has none, so it showed the answer as three blanks
 * for a question that had no blank.
 */
const KNIGHT_ROUTE_E2_F5: BoardAnnotations = {
  arrows: [
    { from: 'e2', to: 'g3', color: 'green' },
    { from: 'g3', to: 'f5', color: 'green' },
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
 * Every band is one question already answered, with the answer ringed
 * (`ANSWER_RING`). The bands used to leave the answer blank — a dashed `??`
 * tile — on the grounds that a blank says "you answer this". It does, but a
 * reader who does not yet know the module cannot tell from `e4 → ??` what
 * kind of thing goes in the blank, and that is the one thing the card is
 * there to say. A worked example says it: `e4 → d4` under a board with both
 * squares marked is the symmetry quiz, in one glance, in any language.
 *
 * Every band is written in the same vocabulary. A named square is a
 * `SquareTile` in the square's own colour; a board is always the same size;
 * where the question and its answer fit on one line they sit on one line,
 * question on the left — the layout `e2 → e4` reads as. Bands that need two
 * lines put the question above the answer.
 *
 * Nothing here carries text that needs translating — squares, notation and
 * piece glyphs read the same in every locale, which is why the band can be
 * built once for all four. It is `aria-hidden` for the same reason the
 * mahjong strip is: the title and the module's own page already say what the
 * practice is, and reading out "e4, arrow, d4" adds nothing.
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
          <Swatch tone="light" answer />
          <Swatch tone="dark" />
        </Row>
      );

    // The one module whose answer is a square on the board rather than a
    // name: the name is asked, and the square is tapped. The circle is the
    // tap. (The module itself prints the name over the board; here the name
    // sits beside it, because printed over a 64px board it covered the very
    // square being pointed at.)
    case 'coordinate_quiz':
      return (
        <Row>
          <Notation>e4</Notation>
          <Arrow />
          <MarkedBoard marks={[{ square: 'e4', role: 'answer' }]} />
        </Row>
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
            {/* A knight cannot go e2→e4, so the verdict is ×. */}
            <Chip className="bg-success/10 text-success">○</Chip>
            <Chip className="bg-destructive/10 text-destructive" answer>
              ×
            </Chip>
          </Row>
        </>
      );

    // The question is a bare square name, but the thing being asked about is
    // what a bishop on it sees, and that is a picture. Two lines cross every
    // square, so the answer is two pairs of end squares, named under the
    // lines that join them.
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
            <Diagonal from="b1" to="h7" />
            <Diagonal from="a8" to="h1" />
          </span>
        </>
      );

    // "The left-right mirror of e4?" — d4. Shown on a board as well as in
    // tiles, because `e4 ↔ d4` alone does not say which way the mirror runs.
    case 'board_symmetry':
      return (
        <>
          <Row>
            <MarkedBoard
              marks={[
                { square: 'e4', role: 'question' },
                { square: 'd4', role: 'answer' },
              ]}
            />
          </Row>
          <Row>
            <SquareTile label="e4" />
            <span className="text-base text-muted-foreground">↔</span>
            <SquareTile label="d4" answer />
          </Row>
        </>
      );

    // From e2 to f5 with a knight: the path is the answer, and the square in
    // the middle of it is the part the reader types.
    case 'route_planner':
      return (
        <>
          <Row>
            <Piece type="n" />
            <BoardThumbnail
              fen={EMPTY_BOARD}
              flipped={false}
              annotations={KNIGHT_ROUTE_E2_F5}
              className={BOARD_SIZE}
            />
          </Row>
          <Row>
            <SquareTile label="e2" />
            <Arrow />
            <SquareTile label="g3" answer />
            <Arrow />
            <SquareTile label="f5" />
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

    // Look at a position, then rebuild it from memory.
    case 'position_memory':
      return (
        <Row>
          <BoardThumbnail fen={SAMPLE_POSITION} flipped={false} className={BOARD_SIZE} />
          <Arrow />
          <BoardThumbnail fen={PARTIALLY_REBUILT_POSITION} flipped={false} className={BOARD_SIZE} />
        </Row>
      );

    // Find the best move. The answer is a move, written as one — a square
    // tile here would have said "name a square".
    case 'puzzle':
      return (
        <Row>
          <BoardThumbnail
            fen={SCHOLARS_MATE_POSITION}
            flipped={false}
            annotations={SCHOLARS_MATE_ANSWER}
            className={BOARD_SIZE}
          />
          <Arrow />
          <Chip answer>Qxf7#</Chip>
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

    // The move is shown, and the notation is chosen from a few candidates —
    // this way round, not "here is Nf3, which move is it": the module's
    // questions each present a move and offer four spellings of it.
    case 'algebraic_notation':
      return (
        <>
          <Row>
            <Piece type="n" />
            <SquareTile label="g1" />
            <Arrow />
            <SquareTile label="f3" />
          </Row>
          <Row>
            <Chip>nf3</Chip>
            <Chip answer>Nf3</Chip>
            <Chip>Kf3</Chip>
          </Row>
        </>
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

    // A game replayed a move at a time from memory: the moves so far, and
    // the next one recalled.
    case 'recall':
      return (
        <Row>
          <Notation>1.e4 e5 2.Nf3</Notation>
          <Chip answer>Nc6</Chip>
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
 * The one mark that says "this is what you answer". Every band shows a
 * question already answered, and this ring is how the answer is told apart
 * from the question around it — a swatch, a tile, a chip or a written move,
 * whichever shape the module's answer takes.
 */
const ANSWER_RING = 'ring-2 ring-primary/60';

/**
 * A square drawn in its own colour, so `e2 → e4` on a card carries the same
 * light/dark information the board would.
 */
function SquareTile({ label, answer = false }: { label: Square; answer?: boolean }) {
  const colorClasses =
    computeSquareColor(label) === 'light'
      ? `${THEME.light} ${THEME.lightCoordinates}`
      : `${THEME.dark} ${THEME.darkCoordinates}`;

  return (
    <span
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded px-1 font-mono text-xs font-bold ${colorClasses} ${answer ? ANSWER_RING : ''}`}
    >
      {label}
    </span>
  );
}

/**
 * An empty board with squares picked out by a dot: the answer's in the
 * answer colour, a question's in a neutral one. A dot, not a
 * `BoardAnnotations` circle — the shared overlay draws circles at a stroke
 * width chosen for a full-size board, and at 64px that ring is a hairline.
 * Positions are fractions of the board, so the dots follow whatever size
 * `BOARD_SIZE` is. White-at-the-bottom orientation, like every board here.
 */
function MarkedBoard({ marks }: { marks: { square: Square; role: 'question' | 'answer' }[] }) {
  return (
    <span className="relative inline-block">
      <BoardThumbnail fen={EMPTY_BOARD} flipped={false} className={BOARD_SIZE} />
      {marks.map(({ square, role }) => {
        const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
        const rank = Number(square[1]);
        // The dot fills the middle 60% of its square: 20% in from each edge.
        const left = (file + 0.2) / 8;
        const top = (8 - rank + 0.2) / 8;
        const size = 0.6 / 8;
        return (
          <span
            key={square}
            className={`absolute rounded-full ${role === 'answer' ? 'bg-primary' : 'bg-foreground/60'}`}
            style={{
              left: `${left * 100}%`,
              top: `${top * 100}%`,
              width: `${size * 100}%`,
              height: `${size * 100}%`,
            }}
          />
        );
      })}
    </span>
  );
}

/** A square-sized block of one board colour: the shape of a "light or dark" answer. */
function Swatch({ tone, answer = false }: { tone: 'light' | 'dark'; answer?: boolean }) {
  return (
    <span
      className={`size-7 rounded ${tone === 'light' ? THEME.light : THEME.dark} ${
        answer ? ANSWER_RING : 'ring-1 ring-border'
      }`}
    />
  );
}

/**
 * One of a few options to choose from — a verdict, a spelling — sized to sit
 * level with a `SquareTile`. Unstyled, it is written notation on the card's
 * own background; `className` gives a verdict its colour.
 */
function Chip({
  children,
  className = 'bg-muted font-mono text-foreground',
  answer = false,
}: {
  children: ReactNode;
  className?: string;
  answer?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-7 items-center rounded px-2.5 text-xs font-bold ${className} ${answer ? ANSWER_RING : ''}`}
    >
      {children}
    </span>
  );
}

/**
 * One diagonal named by its two end squares, ringed as a pair: the answer
 * is the line, not either square.
 */
function Diagonal({ from, to }: { from: Square; to: Square }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md p-0.5 ${ANSWER_RING}`}>
      <SquareTile label={from} />
      <span className="text-xs text-muted-foreground">–</span>
      <SquareTile label={to} />
    </span>
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
