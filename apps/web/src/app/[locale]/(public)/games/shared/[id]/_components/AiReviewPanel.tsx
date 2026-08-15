'use client';

import { useMemo } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaRobot } from 'react-icons/fa';

import type { AiReview, ReviewMoment } from '@/lib/ai-review/types';
import { EVAL_SCORE_LIMIT } from '@/lib/games/analysis/types';
import type { MoveJudgment } from '@/lib/games/analysis/types';

import type { Locale } from '@/app/[locale]/_lib/types';

import { useAiReviewGeneration } from '../_hooks/use-ai-review-generation';

type Props = {
  gameId: string;
  locale: Locale;
  moves: string[];
  startingFen: string | null;
  /**
   * Cached review resolved server-side, or null when none exists yet — in
   * which case this panel is only mounted for a viewer allowed to generate
   * one (see `SharedGameDetailView`), so it can offer the CTA unconditionally.
   */
  initialReview: AiReview | null;
  /** Jump the replay board to the position after the given ply. */
  onJumpToPly: (ply: number) => void;
};

const JUDGMENT_BADGE_CLASS: Record<MoveJudgment, string> = {
  best: 'bg-success',
  good: 'bg-success',
  inaccuracy: 'bg-warning',
  mistake: 'bg-caution',
  blunder: 'bg-destructive',
};

/** "+0.3" / "−1.7"; saturated mate scores render as a mate marker. */
function formatEval(cp: number): string {
  if (cp >= EVAL_SCORE_LIMIT) return '+M';
  if (cp <= -EVAL_SCORE_LIMIT) return '-M';
  const pawns = cp / 100;
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`;
}

/** "18. Nd5" for a white move, "18... Nd5" for a black one. */
function formatMoveLabel(moment: ReviewMoment): string {
  return `${moment.moveNumber}${moment.color === 'white' ? '.' : '...'} ${moment.san}`;
}

/**
 * The AI Review tab body: renders the cached/just-generated review, or the
 * generation flow (CTA → Stockfish progress → LLM wait → result/error).
 *
 * Review prose is ALWAYS rendered as plain text nodes — never markdown,
 * never HTML — so nothing an LLM emits can become markup. The numbers and
 * moves beside the prose come from `review.moments` (server-derived engine
 * facts), joined by ply; see `@/lib/ai-review/types` for the split.
 */
export function AiReviewPanel({
  gameId,
  locale,
  moves,
  startingFen,
  initialReview,
  onJumpToPly,
}: Props) {
  const t = useTranslations('sharedGames');
  const { state, start, cancel } = useAiReviewGeneration({ gameId, locale, moves, startingFen });

  // The hook's 'done' phase is terminal, so the fresh review needs no extra state.
  const review = state.phase === 'done' ? state.review : initialReview;
  if (review) {
    return <ReviewBody review={review} onJumpToPly={onJumpToPly} />;
  }

  if (state.phase === 'analyzing') {
    const percent = Math.round((state.done / state.total) * 100);
    return (
      <div className="space-y-4 py-6">
        <p className="text-sm text-foreground">
          {t('aiReview.analyzing', { done: state.done, total: state.total })}
        </p>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
        <button
          type="button"
          onClick={cancel}
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          {t('aiReview.cancel')}
        </button>
      </div>
    );
  }

  if (state.phase === 'generating') {
    return (
      <div className="flex items-center justify-center gap-3 py-6">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-foreground">{t('aiReview.generating')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-6 text-center">
      <div className="flex justify-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FaRobot className="h-5 w-5" />
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{t('aiReview.notGenerated')}</p>
      {state.phase === 'error' && (
        <p className="text-sm text-destructive" role="alert">
          {t(`aiReview.errors.${state.error}`)}
        </p>
      )}
      <button
        type="button"
        onClick={start}
        className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {state.phase === 'error' ? t('aiReview.retry') : t('aiReview.generateButton')}
      </button>
      {/* The review is stored per (game, locale) and served to every viewer —
          say so before the click, not after. */}
      <p className="text-xs text-muted-foreground">{t('aiReview.publicNotice')}</p>
    </div>
  );
}

function ReviewBody({
  review,
  onJumpToPly,
}: {
  review: AiReview;
  onJumpToPly: (ply: number) => void;
}) {
  const t = useTranslations('sharedGames');
  const momentsByPly = useMemo(
    () => new Map(review.moments.map((m) => [m.ply, m])),
    [review.moments]
  );

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">{t('aiReview.sections.summary')}</h3>
        <p className="whitespace-pre-wrap text-sm text-foreground">{review.content.summary}</p>
      </section>

      {review.content.momentComments.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            {t('aiReview.sections.keyMoments')}
          </h3>
          {review.content.momentComments.map((comment) => {
            const moment = momentsByPly.get(comment.ply);
            if (!moment) return null;
            return (
              <div key={comment.ply} className="space-y-2 rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onJumpToPly(moment.ply)}
                    className="font-mono text-sm font-semibold text-primary hover:underline"
                  >
                    {formatMoveLabel(moment)}
                  </button>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${JUDGMENT_BADGE_CLASS[moment.judgment]}`}
                  >
                    {t(`aiReview.judgments.${moment.judgment}`)}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatEval(moment.evalBefore)} → {formatEval(moment.evalAfter)}
                  </span>
                  {moment.bestMoveSan && (
                    <span className="text-xs text-muted-foreground">
                      {t('aiReview.bestMoveLabel')}:{' '}
                      <span className="font-mono">{moment.bestMoveSan}</span>
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground">{comment.explanation}</p>
                <p className="text-sm text-muted-foreground">{comment.lesson}</p>
              </div>
            );
          })}
        </section>
      )}

      <ProseList title={t('aiReview.sections.strengths')} items={review.content.strengths} />
      <ProseList title={t('aiReview.sections.weaknesses')} items={review.content.weaknesses} />
      <ProseList title={t('aiReview.sections.advice')} items={review.content.advice} />

      {/* Footnote, not a header: the reader came here for the coaching, and a
          provenance caveat above it just delays what they opened the tab for. */}
      <p className="border-t border-border pt-4 text-xs text-muted-foreground">
        {t('aiReview.disclaimer', { model: review.model })}
      </p>
    </div>
  );
}

function ProseList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-foreground">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
