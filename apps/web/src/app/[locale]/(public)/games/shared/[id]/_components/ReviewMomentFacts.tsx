'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { ReviewMoment } from '@/lib/ai-review/types';
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
 * The engine's verdict on one move, as a single wrapping row: grade badge,
 * evaluation before → after, and the move it would have played instead.
 *
 * Everything here is server-derived fact (`ReviewMoment`), never LLM output —
 * see `@/lib/ai-review/types`. Shared by the two surfaces a moment appears on
 * so they cannot drift: the AI Review tab's list and the per-move thread.
 */
export function ReviewMomentFacts({ moment }: { moment: ReviewMoment }) {
  const t = useTranslations('sharedGames');

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* The grade as chess notation (`?!` / `?` / `??`), the same badge the
          board draws — its localized name rides along as the accessible name
          / tooltip. */}
      <MoveJudgmentBadge
        judgment={moment.judgment}
        label={t(`aiReview.judgments.${moment.judgment}`)}
      />
      <span className="font-mono text-xs text-muted-foreground">
        {formatEval(moment.evalBefore)} → {formatEval(moment.evalAfter)}
      </span>
      {moment.bestMoveSan && (
        /* Marked, not captioned: at this size "Best move:" is longer than the
           move it introduces and pushes the row to wrap on a phone. The mark
           is the grade language already in the row — `best` is the green star
           badge — so the two read as one system instead of a badge next to an
           unrelated icon. Its localized name stays available as the badge's
           accessible name and tooltip. */
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <MoveJudgmentBadge judgment="best" label={t('aiReview.bestMoveLabel')} />
          <span className="font-mono">{moment.bestMoveSan}</span>
        </span>
      )}
    </div>
  );
}
