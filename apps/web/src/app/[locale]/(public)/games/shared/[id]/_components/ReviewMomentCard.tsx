'use client';

import type { AiReviewMomentComment, ReviewMoment } from '@/lib/ai-review/types';

import { ReviewMomentFacts, formatMomentMoveLabel } from './ReviewMomentFacts';
import { ReviewPrincipleCallout } from './ReviewPrincipleCallout';

/**
 * One critical moment as the AI Review tab lists it: a bordered card led by
 * the move it judges, which opens that move's board.
 *
 * The same moment reads as a comment in the move's own thread — see
 * `ReviewMomentComment`. Both draw their facts row from `ReviewMomentFacts`.
 */
export function ReviewMomentCard({
  moment,
  comment,
  onJumpToPly,
}: {
  moment: ReviewMoment;
  /** The review's prose for this moment; absent when the LLM skipped it. */
  comment?: AiReviewMomentComment;
  onJumpToPly: (ply: number) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onJumpToPly(moment.ply)}
          className="font-mono text-sm font-semibold text-primary hover:underline"
        >
          {formatMomentMoveLabel(moment)}
        </button>
        <ReviewMomentFacts moment={moment} />
      </div>
      {comment && (
        <>
          <p className="text-sm text-foreground">{comment.explanation}</p>
          <ReviewPrincipleCallout principle={comment.principle} />
          <p className="text-sm text-muted-foreground">{comment.lesson}</p>
        </>
      )}
    </div>
  );
}
