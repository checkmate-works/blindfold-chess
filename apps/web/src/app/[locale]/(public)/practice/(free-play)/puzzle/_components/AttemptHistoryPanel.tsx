'use client';

import { useMemo } from 'react';

import { useTranslations } from 'next-intl';

import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';

type Attempt = { move: string; isCorrect: boolean };

export type PlayerStep = {
  /** All wrong attempts the user submitted while at this step. */
  wrongMoves: string[];
  /**
   * The user's literal correct input that closed this step, or `null` when
   * the user abandoned the step (clicked "View Result" without ever solving
   * it). `null` is the signal the panel uses to switch from a green "solved"
   * chip to a muted "answer revealed" chip.
   */
  correctMove: string | null;
};

type SolvedCell = { kind: 'solved'; wrongMoves: string[]; correctMove: string };
type RevealedCell = { kind: 'revealed'; wrongMoves: string[]; expectedMove: string };
type SkippedCell = { kind: 'skipped'; expectedMove: string };
type OpponentCell = { kind: 'opponent'; san: string };
type EmptyCell = { kind: 'empty' };
type Cell = SolvedCell | RevealedCell | SkippedCell | OpponentCell | EmptyCell;

type Row = {
  moveNumber: number;
  white: Cell;
  black: Cell;
};

export type AttemptStatus = {
  /**
   * `solved` — every player slot was answered correctly.
   * `partial` — at least one but not all player slots were solved before
   *             the user navigated away via "View Result".
   * `revealed` — the user gave up before solving any player slot.
   */
  state: 'solved' | 'partial' | 'revealed';
  correctCount: number;
  totalPlayerSteps: number;
};

type Props = {
  fen: string;
  solutionSans: string[];
  attempts: Attempt[];
};

/**
 * Groups player attempts by the puzzle step they targeted. Walking the
 * chronological attempt log, every wrong attempt accumulates under the
 * current step; the first correct attempt closes the step and advances
 * the cursor. Trailing wrongs at a still-open step (puzzle abandoned mid-way)
 * are surfaced as a step with `correctMove === null` so the panel can
 * still render them.
 */
export function groupAttemptsByPlayerStep(attempts: Attempt[]): PlayerStep[] {
  const groups: PlayerStep[] = [];
  let current: PlayerStep = { wrongMoves: [], correctMove: null };

  for (const a of attempts) {
    if (a.isCorrect) {
      current.correctMove = a.move;
      groups.push(current);
      current = { wrongMoves: [], correctMove: null };
    } else {
      current.wrongMoves.push(a.move);
    }
  }

  if (current.wrongMoves.length > 0) {
    groups.push(current);
  }

  return groups;
}

/**
 * Parse the fullmove number (6th field) from a FEN string. Falls back to 1
 * if the FEN is short or the field is non-numeric — the panel still renders
 * sensibly with a starting count of 1.
 */
export function getFullmoveFromFen(fen: string): number {
  const parts = fen.split(' ');
  if (parts.length < 6) return 1;
  const n = parseInt(parts[5]!, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/**
 * Derive the high-level outcome the user reached by the time they landed
 * on the result page. Counts how many player slots were solved and
 * compares against the total number of player slots in the chosen
 * solution line. Used by both the AttemptHistoryPanel cell renderer
 * (to pick `solved` / `revealed` / `skipped` styling per cell) and the
 * standalone `<AttemptStatusBadge>` (to label the section as a whole).
 */
export function computeAttemptStatus(attempts: Attempt[], solutionSans: string[]): AttemptStatus {
  const groups = groupAttemptsByPlayerStep(attempts);
  const correctCount = groups.filter((g) => g.correctMove !== null).length;
  const totalPlayerSteps = Math.ceil(solutionSans.length / 2);

  let state: AttemptStatus['state'];
  if (totalPlayerSteps > 0 && correctCount === totalPlayerSteps) {
    state = 'solved';
  } else if (correctCount === 0) {
    state = 'revealed';
  } else {
    state = 'partial';
  }

  return { state, correctCount, totalPlayerSteps };
}

/**
 * Build the per-solution-move cell sequence. Player turns become one of
 * three cell kinds depending on the user's progress:
 *   - `solved`: there is a matching attempt group with a recorded correct
 *               move — render the user's literal input as the green chip.
 *   - `revealed`: the user attempted this step and ran out of guesses
 *                 (clicked "View Result" mid-step) — render their wrong
 *                 inputs followed by the canonical SAN as the muted
 *                 answer-reveal chip.
 *   - `skipped`: the user never reached this step — render only the
 *                muted answer-reveal chip.
 * Opponent turns are auto-played and rendered as plain SAN.
 */
export function buildCells(solutionSans: string[], groups: PlayerStep[]): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < solutionSans.length; i++) {
    const isPlayerTurn = i % 2 === 0;
    const san = solutionSans[i]!;
    if (!isPlayerTurn) {
      cells.push({ kind: 'opponent', san });
      continue;
    }
    const playerStepIdx = i / 2;
    const group = groups[playerStepIdx];
    if (!group) {
      cells.push({ kind: 'skipped', expectedMove: san });
    } else if (group.correctMove !== null) {
      cells.push({
        kind: 'solved',
        wrongMoves: group.wrongMoves,
        correctMove: group.correctMove,
      });
    } else {
      cells.push({
        kind: 'revealed',
        wrongMoves: group.wrongMoves,
        expectedMove: san,
      });
    }
  }
  return cells;
}

/**
 * Pair the linear cell sequence into white/black rows with chess fullmove
 * numbering. When the puzzle starts from a black-to-move FEN, the first row
 * has an empty white cell and the move number stays at the FEN's starting
 * fullmove (it has not yet ticked over to the next number).
 */
export function buildRows(cells: Cell[], firstTurn: 'w' | 'b', startFullmove: number): Row[] {
  const rows: Row[] = [];

  let cellIdx = 0;
  let moveNumber = startFullmove;

  if (firstTurn === 'b' && cells.length > 0) {
    rows.push({
      moveNumber,
      white: { kind: 'empty' },
      black: cells[0]!,
    });
    cellIdx = 1;
    moveNumber += 1;
  }

  while (cellIdx < cells.length) {
    const white = cells[cellIdx]!;
    const black = cells[cellIdx + 1] ?? { kind: 'empty' as const };
    rows.push({ moveNumber, white, black });
    cellIdx += 2;
    moveNumber += 1;
  }

  return rows;
}

const WRONG_CHIP =
  'inline-flex items-baseline rounded px-1.5 py-0.5 text-xs text-red-600 dark:text-red-400 line-through opacity-80 bg-red-500/5 dark:bg-red-500/10';

const CORRECT_CHIP =
  'inline-flex items-baseline rounded px-1.5 py-0.5 font-semibold text-green-700 dark:text-green-300 bg-green-500/10 dark:bg-green-500/15';

// Answer-reveal chip: the canonical SAN from the puzzle solution shown when
// the user did not solve this step on their own. Dashed border + italic +
// muted color is enough to read as "not your answer" without needing an
// explicit "correct answer:" label that would bloat the row width.
const REVEALED_CHIP =
  'inline-flex items-baseline rounded px-1.5 py-0.5 italic text-muted-foreground border border-dashed border-border';

function CellContent({ cell }: { cell: Cell }) {
  if (cell.kind === 'empty') {
    return <span className="text-muted-foreground">…</span>;
  }
  if (cell.kind === 'opponent') {
    return <span className="text-muted-foreground">{cell.san}</span>;
  }
  if (cell.kind === 'skipped') {
    return <span className={REVEALED_CHIP}>{cell.expectedMove}</span>;
  }
  if (cell.kind === 'revealed') {
    return (
      <span className="inline-flex flex-wrap items-baseline gap-1.5">
        {cell.wrongMoves.map((m, i) => (
          <span key={`w-${i}`} className={WRONG_CHIP}>
            {m}
          </span>
        ))}
        <span className={REVEALED_CHIP}>{cell.expectedMove}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-baseline gap-1.5">
      {cell.wrongMoves.map((m, i) => (
        <span key={`w-${i}`} className={WRONG_CHIP}>
          {m}
        </span>
      ))}
      <span className={CORRECT_CHIP}>{cell.correctMove}</span>
    </span>
  );
}

const BADGE_BASE =
  'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border whitespace-nowrap';
const BADGE_VARIANTS: Record<AttemptStatus['state'], string> = {
  solved: 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30',
  partial: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  revealed: 'bg-muted/60 text-muted-foreground border-border',
};

export function AttemptStatusBadge({ status }: { status: AttemptStatus }) {
  const t = useTranslations('practice.puzzle.result');
  const label =
    status.state === 'solved'
      ? t('statusSolved')
      : status.state === 'partial'
        ? t('statusPartial', {
            correct: status.correctCount,
            total: status.totalPlayerSteps,
          })
        : t('statusRevealed');

  return <span className={`${BADGE_BASE} ${BADGE_VARIANTS[status.state]}`}>{label}</span>;
}

export function AttemptHistoryPanel({ fen, solutionSans, attempts }: Props) {
  const rows = useMemo(() => {
    const groups = groupAttemptsByPlayerStep(attempts);
    const cells = buildCells(solutionSans, groups);
    const firstTurn: 'w' | 'b' = isBlackToMoveFromFen(fen) ? 'b' : 'w';
    return buildRows(cells, firstTurn, getFullmoveFromFen(fen));
  }, [fen, solutionSans, attempts]);

  if (rows.length === 0) return null;

  return (
    <div className="border border-border rounded-lg">
      <div className="p-4 font-mono space-y-1">
        {rows.map((row) => (
          <div key={row.moveNumber} className="flex items-baseline text-sm">
            <span className="w-10 shrink-0 text-right pr-2 text-muted-foreground">
              {row.moveNumber}.
            </span>
            <span className="flex-1 px-2">
              <CellContent cell={row.white} />
            </span>
            <span className="flex-1 px-2">
              <CellContent cell={row.black} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
