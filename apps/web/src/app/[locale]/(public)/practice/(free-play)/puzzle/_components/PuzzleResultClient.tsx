'use client';

import { useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { fenToLichessUrl } from '@blindfold-chess/features/chess-core/fen';
import type { ExpInfo } from '@blindfold-chess/features/exp';
import { FaExternalLinkAlt, FaEye } from 'react-icons/fa';

import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';

import { ExpGainDisplay } from '@/app/[locale]/(public)/practice/_components/ExpGainDisplay';
import { SignUpBanner } from '@/app/[locale]/(public)/practice/_components/SignUpBanner';
import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { Attempt } from '../_lib/puzzle-match';
import { puzzleResultStorageKey } from '../_lib/puzzle-result-storage';
import {
  AttemptHistoryPanel,
  AttemptStatusBadge,
  computeAttemptStatus,
} from './AttemptHistoryPanel';
import { PuzzleSolutionReplay } from './PuzzleSolutionReplay';

type Props = {
  locale: Locale;
  positionId: string;
  fen: string;
  solutionLines: string[];
  solutionMoveLists: PuzzleSolutionMove[][];
  /**
   * EXP info fetched server-side via `getExpInfoBySource` from the
   * `?grant=<expEventId>` query param the session client appends on solve.
   * `null` when unauthenticated, when the param is missing, or when the
   * event was not found — in which case `<ExpGainDisplay>` renders nothing.
   */
  expInfo: ExpInfo | null;
};

export function PuzzleResultClient({
  locale,
  positionId,
  fen,
  solutionLines,
  solutionMoveLists,
  expInfo,
}: Props) {
  const t = useTranslations('practice.puzzle.result');
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [solutionLine, setSolutionLine] = useState<string>(solutionLines[0] ?? '');
  const [peekCount, setPeekCount] = useState(0);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(puzzleResultStorageKey(positionId));
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

  const lockedSans = useMemo(() => lockedMoves.map((m) => m.san), [lockedMoves]);
  const attemptStatus = useMemo(
    () => computeAttemptStatus(attempts, lockedSans),
    [attempts, lockedSans]
  );

  return (
    <div className="space-y-6">
      <PuzzleSolutionReplay fen={fen} solutionMoves={lockedMoves} showSectionTitle />

      {/* (B) Attempt history — laid out in PGN-style W/B rows so the
       *     numbering matches the puzzle's actual move sequence (derived
       *     from the FEN's fullmove number + side-to-move). Each player
       *     turn cell shows wrong attempts as struck-through chips followed
       *     by the correct move; opponent auto-replies render as plain SAN.
       */}
      {attempts.length > 0 && (
        <div className="space-y-3">
          <SectionTitle>{t('historySection')}</SectionTitle>
          <AttemptHistoryPanel fen={fen} solutionSans={lockedSans} attempts={attempts} />
          <div className="flex justify-end">
            <AttemptStatusBadge status={attemptStatus} />
          </div>
        </div>
      )}

      {/* (C) Peek count */}
      {peekCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FaEye className="w-4 h-4" />
          <span>{t('peekCount', { count: peekCount })}</span>
        </div>
      )}

      {/* EXP gained banner — renders nothing if `expInfo` is null (guest user,
       *  no `?grant=` param, or event not found). Placed just above the Try
       *  Again button so the EXP card sits directly over the primary CTA,
       *  matching position-memory's layout. */}
      <ExpGainDisplay expInfo={expInfo} />

      {/* Sign-up nudge for anonymous solvers (renders nothing when signed in).
          Sits in the same slot as the EXP card — directly above the action
          buttons — so guests who just solved a community puzzle see the prompt
          to create an account before the retry / back-to-list buttons can carry
          them away. (EXP and this banner are mutually exclusive: expInfo is
          null for guests.) */}
      <SignUpBanner locale={locale} />

      {/* (D) Action buttons */}
      <div className="flex flex-col gap-3 pt-4">
        <Link href={`/practice/puzzle/${positionId}`}>
          <Button asChild variant="primary" size="lg" fullWidth>
            {t('tryAgain')}
          </Button>
        </Link>
        <Link href="/practice/puzzle">
          <Button asChild variant="secondary" size="lg" fullWidth>
            {t('backToList')}
          </Button>
        </Link>
        <Button
          onClick={() => window.open(fenToLichessUrl(fen), '_blank')}
          variant="secondary"
          size="lg"
          fullWidth
          icon={<FaExternalLinkAlt className="w-4 h-4" />}
        >
          {t('analyzeOnLichess')}
        </Button>
      </div>
    </div>
  );
}
