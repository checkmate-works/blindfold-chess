import { SectionTitle } from '@/app/[locale]/_components';

import type { PracticeCompleteLabels, ScoreStats } from '../_lib/practice-complete-types';
import { isDetailedPieceStats } from '../_lib/practice-complete-types';
import { SegmentedProgressBar } from './SegmentedProgressBar';

type Props = {
  score: number;
  total: number;
  labels: PracticeCompleteLabels;
  averageTimeText?: string;
  scoreStats?: ScoreStats;
};

export function PracticeCompleteSummary({
  score,
  total,
  labels,
  averageTimeText,
  scoreStats,
}: Props) {
  return (
    <>
      {/* Score display */}
      {scoreStats && labels.recreationProgress ? (
        <SectionTitle className="text-2xl font-bold text-center mb-6">{labels.score}</SectionTitle>
      ) : (
        <div className="mb-6 text-center">
          <p className="text-3xl font-bold text-foreground mb-2">
            {score} / {total}
          </p>
          <p className="text-muted-foreground">{labels.score}</p>
          {averageTimeText && (
            <p className="text-sm text-muted-foreground mt-2">
              {labels.averageTime || 'Average Time'}: {averageTimeText}
            </p>
          )}
        </div>
      )}

      {/* Score stats with progress bar */}
      {scoreStats && labels.recreationProgress && (
        <div className="mb-6">
          <p className="text-sm font-medium text-muted-foreground mb-2 text-left">
            {labels.recreationProgress}
          </p>
          {isDetailedPieceStats(scoreStats) ? (
            <>
              <SegmentedProgressBar
                segments={[
                  {
                    key: 'correct',
                    value: scoreStats.correctPieces,
                    color: 'bg-success',
                    label: labels.correct,
                  },
                  {
                    key: 'incorrect',
                    value: scoreStats.incorrectPieces,
                    color: 'bg-destructive',
                    label: labels.incorrect,
                  },
                  {
                    key: 'missing',
                    value: scoreStats.missingPieces,
                    color: 'bg-muted-foreground/40',
                    label: labels.missing,
                  },
                ]}
                total={scoreStats.totalPieces}
              />

              {scoreStats.extraPieces > 0 && labels.extra && labels.extraDescription && (
                <p className="text-xs text-muted-foreground mt-3">
                  {labels.extra}: <span className="font-semibold">+{scoreStats.extraPieces}</span> (
                  {labels.extraDescription})
                </p>
              )}
            </>
          ) : (
            <SegmentedProgressBar
              segments={[
                {
                  key: 'correct',
                  value: scoreStats.correct,
                  color: 'bg-success',
                  label: labels.correct,
                },
                {
                  key: 'incorrect',
                  value: scoreStats.incorrect,
                  color: 'bg-destructive',
                  label: labels.incorrect,
                },
              ]}
              total={scoreStats.total}
            />
          )}

          {averageTimeText && (
            <p className="text-sm text-center text-muted-foreground mt-4">
              {labels.averageTime || 'Average Time'}: {averageTimeText}
            </p>
          )}
        </div>
      )}
    </>
  );
}
