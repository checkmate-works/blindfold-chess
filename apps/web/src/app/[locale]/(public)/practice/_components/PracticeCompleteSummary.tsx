import { SectionTitle } from '@/app/[locale]/_components';

import { SegmentedProgressBar } from './SegmentedProgressBar';
import type { PracticeCompleteLabels } from './practice-complete-types';

type Props = {
  score: number;
  total: number;
  labels: PracticeCompleteLabels;
  averageTimeText?: string;
  detailedStats?: {
    correctPieces: number;
    totalPieces: number;
    incorrectPieces: number;
    missingPieces: number;
    extraPieces: number;
  };
};

export function PracticeCompleteSummary({
  score,
  total,
  labels,
  averageTimeText,
  detailedStats,
}: Props) {
  return (
    <>
      {/* Score display */}
      {detailedStats && labels.recreationProgress ? (
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

      {/* Detailed stats with progress bar (for position memory) */}
      {detailedStats && labels.recreationProgress && (
        <div className="mb-6">
          <p className="text-sm font-medium text-muted-foreground mb-2 text-left">
            {labels.recreationProgress}
          </p>
          <SegmentedProgressBar
            segments={[
              {
                key: 'correct',
                value: detailedStats.correctPieces,
                color: 'bg-success',
                label: labels.correct,
              },
              {
                key: 'incorrect',
                value: detailedStats.incorrectPieces,
                color: 'bg-destructive',
                label: labels.incorrect,
              },
              {
                key: 'missing',
                value: detailedStats.missingPieces,
                color: 'bg-muted-foreground/40',
                label: labels.missing,
              },
            ]}
            total={detailedStats.totalPieces}
          />

          {detailedStats.extraPieces > 0 && labels.extra && labels.extraDescription && (
            <p className="text-xs text-muted-foreground mt-3">
              {labels.extra}: <span className="font-semibold">+{detailedStats.extraPieces}</span> (
              {labels.extraDescription})
            </p>
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
