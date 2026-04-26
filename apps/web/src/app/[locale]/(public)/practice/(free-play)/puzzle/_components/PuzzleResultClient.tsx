'use client';

import { useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { FaEye } from 'react-icons/fa';

import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';

import { SectionTitle } from '@/app/[locale]/_components';

import { PuzzleSolutionReplay } from './PuzzleSolutionReplay';

type Attempt = { move: string; isCorrect: boolean };

type Props = {
  positionId: string;
  fen: string;
  solutionLines: string[];
  solutionMoveLists: PuzzleSolutionMove[][];
};

export function PuzzleResultClient({ positionId, fen, solutionLines, solutionMoveLists }: Props) {
  const t = useTranslations('practice.puzzle.result');
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [solutionLine, setSolutionLine] = useState<string>(solutionLines[0] ?? '');
  const [peekCount, setPeekCount] = useState(0);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`puzzle_result_${positionId}`);
      if (stored) {
        const data = JSON.parse(stored) as {
          attempts: Attempt[];
          solutionLine: string;
          peekCount?: number;
        };
        setAttempts(data.attempts);
        if (data.solutionLine) {
          setSolutionLine(data.solutionLine);
        }
        if (typeof data.peekCount === 'number') {
          setPeekCount(data.peekCount);
        }
      }
    } catch {
      // sessionStorage may be unavailable or data malformed
    }
  }, [positionId]);

  // Resolve the locked solution back to its server-side `{san, note}[]` shape
  // by matching the stored `solutionLine` string against each candidate's
  // joined SAN tokens. sessionStorage carries only the line string (to keep
  // the session → result handoff compact + backward-compatible), so the
  // per-move note metadata has to be looked up from the prop the page
  // passed in. If no list matches (schema drift, cache miss), fall back to
  // the first line with null notes — the chip list still renders.
  const lockedMoves = useMemo<PuzzleSolutionMove[]>(() => {
    if (!solutionLine) return [];
    const hit = solutionMoveLists.find((list) => list.map((m) => m.san).join(' ') === solutionLine);
    if (hit) return hit;
    return solutionLine
      .split(/\s+/)
      .filter(Boolean)
      .map((san) => ({ san, note: null }));
  }, [solutionLine, solutionMoveLists]);

  return (
    <div className="space-y-6">
      <PuzzleSolutionReplay fen={fen} solutionMoves={lockedMoves} showSectionTitle />

      {/* (B) Attempt history — unordered list. Each bullet is one submitted
       *     move, which may or may not have been correct; we intentionally
       *     do NOT number the bullets because an incorrect attempt would
       *     shift the numbering out of step with the puzzle's actual move
       *     sequence and mislead the reader.
       */}
      {attempts.length > 0 && (
        <>
          <SectionTitle>{t('historySection')}</SectionTitle>
          <ul className="mx-auto max-w-md flex flex-col gap-1 text-sm list-disc list-inside">
            {attempts.map((attempt, index) => (
              <li key={index}>
                {attempt.isCorrect ? (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    &#x2705; {attempt.move}
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400 line-through">
                    &#x274C; {attempt.move}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* (C) Peek count */}
      {peekCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FaEye className="w-4 h-4" />
          <span>{t('peekCount', { count: peekCount })}</span>
        </div>
      )}

      {/* (D) Action buttons */}
      <div className="flex flex-col gap-3 pt-4">
        <Link href={`/practice/puzzle/${positionId}`}>
          <Button asChild variant="primary" fullWidth>
            {t('tryAgain')}
          </Button>
        </Link>
        <Link href="/practice/puzzle">
          <Button asChild variant="secondary" fullWidth>
            {t('backToList')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
