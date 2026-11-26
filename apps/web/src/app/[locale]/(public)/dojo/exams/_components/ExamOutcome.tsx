'use client';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { EarnedRankSlug } from '@blindfold-chess/features/dojo-ranks';

import type { ExamVerdict } from '../_hooks/use-exam-submission';

type Props = {
  rank: EarnedRankSlug;
  verdict: Exclude<ExamVerdict, { kind: 'idle' }>;
  /** Name of the rank a player has to hold before a pass is recorded. */
  prevRankName: string;
  onRetry: () => void;
};

/**
 * The verdict on one exam attempt — passed, passed without a record (and
 * why), failed, or not sent — with a retry and a way back to the problem
 * list.
 */
export function ExamOutcome({ rank, verdict, prevRankName, onRetry }: Props) {
  const t = useTranslations('dojoExam');
  const tPlay = useTranslations('play');
  const tMemory = useTranslations('practice.positionMemory');

  let message: string;
  let note: string | null = null;
  let accuracy: number | null = null;
  switch (verdict.kind) {
    case 'submitting':
      message = tPlay('loading');
      break;
    case 'promoted':
      message = t('passed');
      break;
    case 'error':
      message = t('recordFailed');
      break;
    case 'graded':
      accuracy = verdict.accuracy;
      if (!verdict.passed) message = t('failed');
      else message = verdict.unrecorded ? t('passedUnrecorded') : t('passed');
      if (verdict.unrecorded === 'signIn') note = t('signInNote');
      else if (verdict.unrecorded === 'locked') note = t('lockedNote', { prevRankName });
      break;
  }

  const settled = verdict.kind === 'graded' || verdict.kind === 'error';
  const passed = verdict.kind === 'promoted' || (verdict.kind === 'graded' && verdict.passed);

  return (
    <div className="space-y-6" data-testid="exam-outcome">
      <div aria-live="polite" className="space-y-2 text-center">
        <p
          data-testid="exam-outcome-message"
          className={`text-lg font-semibold ${passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}
        >
          {message}
        </p>
        {accuracy !== null && (
          <p className="text-muted-foreground">
            {tMemory('accuracy')}: {Math.round(accuracy)}%
          </p>
        )}
        {note && (
          <p data-testid="exam-outcome-note" className="text-sm text-muted-foreground">
            {note}
          </p>
        )}
      </div>
      {settled && (
        <div className="flex flex-col gap-3">
          <Button variant="primary" size="lg" fullWidth onClick={onRetry}>
            {t('retry')}
          </Button>
          <Link href={`/dojo/exams/${rank}`}>
            <Button asChild variant="secondary" size="lg" fullWidth>
              {t('backToExam')}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
