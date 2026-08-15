'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { AiReviewMomentComment, ReviewMoment } from '@/lib/ai-review/types';
import { EVAL_SCORE_LIMIT } from '@/lib/games/analysis/types';
import { MoveJudgmentBadge } from '@/lib/games/evaluation';

/** "+0.3" / "-1.7"; saturated mate scores render as a mate marker. */
export function formatEval(cp: number): string {
  if (cp >= EVAL_SCORE_LIMIT) return '+M';
  if (cp <= -EVAL_SCORE_LIMIT) return '-M';
  const pawns = cp / 100;
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`;
}

/** "18. Nd5" for a white move, "18... Nd5" for a black one. */
export function formatMomentMoveLabel(moment: ReviewMoment): string {
  return `${moment.moveNumber}${moment.color === 'white' ? '.' : '...'} ${moment.san}`;
}

/**
 * One critical moment of the AI review: the engine's facts about the move
 * (grade, evaluation swing, preferred alternative) above the LLM's prose about
 * it. Shared by the two places a moment surfaces — the AI Review tab's list,
 * and the per-move discussion panel of the move it judges — so the two can
 * never drift into showing different things about the same move.
 *
 * The engine/LLM split is visible here: everything on the header row comes
 * from `moment` (server-derived), the two paragraphs from `comment`. See
 * `@/lib/ai-review/types`.
 */
export function ReviewMomentCard({
  moment,
  comment,
  onJumpToPly,
}: {
  moment: ReviewMoment;
  /**
   * The review's prose for this moment. Absent when the LLM wrote nothing
   * about a selected moment — the engine facts alone still say something the
   * board does not (the evaluation swing, the move's name).
   */
  comment?: AiReviewMomentComment;
  /**
   * When set, the move label leads the row as a button opening that move's
   * board. Omitted where the surface IS that board, and the move is already
   * named above.
   */
  onJumpToPly?: (ply: number) => void;
}) {
  const t = useTranslations('sharedGames');

  return (
    <div className="space-y-2 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        {onJumpToPly && (
          <button
            type="button"
            onClick={() => onJumpToPly(moment.ply)}
            className="font-mono text-sm font-semibold text-primary hover:underline"
          >
            {formatMomentMoveLabel(moment)}
          </button>
        )}
        {/* The grade as chess notation (`?!` / `?` / `??`), the same badge the
            board draws — its localized name rides along as the accessible
            name / tooltip. */}
        <MoveJudgmentBadge
          judgment={moment.judgment}
          label={t(`aiReview.judgments.${moment.judgment}`)}
        />
        <span className="font-mono text-xs text-muted-foreground">
          {formatEval(moment.evalBefore)} → {formatEval(moment.evalAfter)}
        </span>
        {moment.bestMoveSan && (
          /* Naming it is enough: the same alternative is on the board as a
             green engine arrow wherever this card is shown. */
          <span className="text-xs text-muted-foreground">
            {t('aiReview.bestMoveLabel')}: <span className="font-mono">{moment.bestMoveSan}</span>
          </span>
        )}
      </div>
      {comment && (
        <>
          <p className="text-sm text-foreground">{comment.explanation}</p>
          <p className="text-sm text-muted-foreground">{comment.lesson}</p>
        </>
      )}
    </div>
  );
}
