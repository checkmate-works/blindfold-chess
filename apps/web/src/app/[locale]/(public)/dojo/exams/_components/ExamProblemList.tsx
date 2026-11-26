'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { EarnedRankSlug, ExamProblemKind } from '@blindfold-chess/features/dojo-ranks';

import { captureError } from '@/lib/sentry/capture-error';

import { getExamStatus } from '../_actions/getExamStatus';
import type { ExamStatus } from '../_lib/types';

export type ExamProblemRow = {
  kind: ExamProblemKind;
  name: string;
  /** The problem's condition, e.g. "Memorize the position in 30 seconds …". */
  rule: string;
  /** Locale-less path of the problem's page. */
  href: string;
};

type Props = {
  rank: EarnedRankSlug;
  rows: ExamProblemRow[];
  /** Name of the rank a player has to hold before a pass is recorded. */
  prevRankName: string;
};

/**
 * The problems of a rank's exam, each with a start link, plus the viewer's
 * own standing — read after hydration through `getExamStatus` so the page
 * itself can be prerendered once for everyone.
 *
 * A problem already passed on record is marked solved. Under the list, a
 * note says when a pass would not be recorded:
 *
 * - signed out — the exam can still be taken, graded in the browser as
 *   practice, and signing in is what records it;
 * - signed in without the rank right below the exam — a pass is graded but
 *   not recorded until that rank is held.
 *
 * The second rule exists because the dojo reads a player's highest rank as
 * covering every rank below it. Recording 2kyu's exam for someone holding
 * only 5kyu would make 4kyu and 3kyu look done as well, so a pass counts
 * only for a player on that rung (or one who already holds the rank). The
 * server enforces this when recording; the note only explains it.
 */
export function ExamProblemList({ rank, rows, prevRankName }: Props) {
  const t = useTranslations('dojoExam');
  const [status, setStatus] = useState<ExamStatus | null>(null);

  useEffect(() => {
    let active = true;
    getExamStatus(rank)
      .then((next) => {
        if (active) setStatus(next);
      })
      .catch((err) => captureError(err, '[ExamProblemList] getExamStatus'));
    return () => {
      active = false;
    };
  }, [rank]);

  const solved = new Set(status?.signedIn ? status.solved : []);
  let note: string | null = null;
  if (status && !status.signedIn) note = t('signInNote');
  else if (status?.signedIn && !status.eligible) note = t('lockedNote', { prevRankName });

  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {rows.map((row) => (
          <li
            key={row.kind}
            data-testid={`exam-problem-${row.kind}`}
            className="space-y-3 rounded-lg border border-border p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-foreground">{row.name}</p>
              {solved.has(row.kind) && (
                <span
                  data-testid={`exam-problem-solved-${row.kind}`}
                  className="text-sm font-semibold text-emerald-600 dark:text-emerald-400"
                >
                  {t('solved')}
                </span>
              )}
            </div>
            <p className="text-foreground/80">{row.rule}</p>
            <Link href={row.href} className="block">
              <Button asChild variant="primary" size="md" fullWidth>
                {t('start')}
              </Button>
            </Link>
          </li>
        ))}
      </ul>
      {note && (
        <p data-testid="exam-status-note" className="text-sm text-muted-foreground">
          {note}
        </p>
      )}
    </div>
  );
}
