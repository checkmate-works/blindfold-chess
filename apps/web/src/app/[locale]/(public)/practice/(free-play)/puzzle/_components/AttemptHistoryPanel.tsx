'use client';

import { useMemo } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';
import { fullmoveNumberFromFen } from '@blindfold-chess/features/chess-core/fen';
import { buildCells, buildRows, groupAttemptsByPlayerStep } from '@blindfold-chess/features/puzzle';
import type { Attempt, AttemptCell, AttemptStatus } from '@blindfold-chess/features/puzzle';
import type { PieceColor } from '@blindfold-chess/types';

import { CircleMarker } from './CircleMarker';

type Props = {
  fen: string;
  solutionSans: string[];
  attempts: Attempt[];
  /** Parallel array to `solutionSans` — per-move commentary from the puzzle's solution data. */
  notes?: (string | null)[];
};

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

function CellContent({
  cell,
  formatNote,
}: {
  cell: AttemptCell;
  formatNote: (note: string) => string;
}) {
  if (cell.kind === 'empty') {
    return <span className="text-muted-foreground">…</span>;
  }

  const noteNode = cell.note ? (
    <span className="ml-1 text-muted-foreground">{formatNote(cell.note)}</span>
  ) : null;

  if (cell.kind === 'opponent') {
    return (
      <>
        <span className="text-muted-foreground">{cell.san}</span>
        {noteNode}
      </>
    );
  }
  if (cell.kind === 'skipped') {
    return (
      <>
        <span className={REVEALED_CHIP}>{cell.expectedMove}</span>
        {noteNode}
      </>
    );
  }
  if (cell.kind === 'revealed') {
    return (
      <>
        <span className="inline-flex flex-wrap items-baseline gap-1.5">
          {cell.wrongMoves.map((m, i) => (
            <span key={`w-${i}`} className={WRONG_CHIP}>
              {m}
            </span>
          ))}
          <span className={REVEALED_CHIP}>{cell.expectedMove}</span>
        </span>
        {noteNode}
      </>
    );
  }
  return (
    <>
      <span className="inline-flex flex-wrap items-baseline gap-1.5">
        {cell.wrongMoves.map((m, i) => (
          <span key={`w-${i}`} className={WRONG_CHIP}>
            {m}
          </span>
        ))}
        <span className={CORRECT_CHIP}>{cell.correctMove}</span>
      </span>
      {noteNode}
    </>
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

export function AttemptHistoryPanel({ fen, solutionSans, attempts, notes = [] }: Props) {
  const t = useTranslations('practice.puzzle.result');
  const tCommon = useTranslations('practice.common');

  const rows = useMemo(() => {
    const groups = groupAttemptsByPlayerStep(attempts);
    const cells = buildCells(solutionSans, groups, notes);
    const firstTurn: PieceColor = isBlackToMoveFromFen(fen) ? 'b' : 'w';
    return buildRows(cells, firstTurn, fullmoveNumberFromFen(fen));
  }, [fen, solutionSans, attempts, notes]);

  if (rows.length === 0) return null;

  const formatNote = (note: string) => t('note', { note });

  return (
    <div className="border border-border rounded-lg">
      <div className="flex items-center px-4 pt-3 text-xs font-medium text-muted-foreground">
        <span className="w-10 shrink-0" />
        <span className="flex-1 px-2 flex items-center gap-1.5">
          <CircleMarker color="w" />
          {tCommon('white')}
        </span>
        <span className="flex-1 px-2 flex items-center gap-1.5">
          <CircleMarker color="b" />
          {tCommon('black')}
        </span>
      </div>
      <div className="p-4 font-mono space-y-1">
        {rows.map((row) => (
          <div key={row.moveNumber} className="flex items-baseline text-sm">
            <span className="w-10 shrink-0 text-right pr-2 text-muted-foreground">
              {row.moveNumber}.
            </span>
            <span className="flex-1 px-2">
              <CellContent cell={row.white} formatNote={formatNote} />
            </span>
            <span className="flex-1 px-2">
              <CellContent cell={row.black} formatNote={formatNote} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
