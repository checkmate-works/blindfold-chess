'use client';

import { useId, useMemo, useState } from 'react';

import { SUPPORTED_LOCALES } from '@/config';
import { LOCALE_LABELS } from '@/i18n/locale-labels';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaRobot } from 'react-icons/fa';

import type { AiReview, ReviewMoment } from '@/lib/ai-review/types';
import { EVAL_SCORE_LIMIT } from '@/lib/games/analysis/types';
import { MoveJudgmentBadge } from '@/lib/games/evaluation';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
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
  const { state, start, cancel } = useAiReviewGeneration({ gameId, moves, startingFen });
  const [confirming, setConfirming] = useState(false);
  // The page's language is the obvious default; the picker exists because this
  // one review is what every visitor will read, whatever page they came from.
  const [targetLocale, setTargetLocale] = useState<Locale>(locale);
  const languageSelectId = useId();

  // The hook's 'done' phase is terminal, so the fresh review needs no extra state.
  const review = state.phase === 'done' ? state.review : initialReview;
  if (review) {
    return <ReviewBody review={review} viewerLocale={locale} onJumpToPly={onJumpToPly} />;
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
    <>
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
          onClick={() => setConfirming(true)}
          className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {state.phase === 'error' ? t('aiReview.retry') : t('aiReview.generateButton')}
        </button>
      </div>

      {/* Generation publishes something the author cannot take back, spends a
          slot of their daily budget, and fixes the review's language — all
          from one click, so it asks first. */}
      <ConfirmationModal
        isOpen={confirming}
        title={t('aiReview.confirm.title')}
        message={t('aiReview.confirm.message')}
        confirmText={t('aiReview.confirm.submit')}
        cancelText={t('aiReview.confirm.cancel')}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          start(targetLocale);
        }}
      >
        <div className="mt-4 space-y-1">
          <label htmlFor={languageSelectId} className="block text-sm font-medium text-foreground">
            {t('aiReview.confirm.languageLabel')}
          </label>
          <select
            id={languageSelectId}
            value={targetLocale}
            onChange={(event) => setTargetLocale(event.target.value as Locale)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            {SUPPORTED_LOCALES.map((supported) => (
              <option key={supported} value={supported}>
                {LOCALE_LABELS[supported]}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{t('aiReview.confirm.languageHelp')}</p>
        </div>
      </ConfirmationModal>
    </>
  );
}

function ReviewBody({
  review,
  viewerLocale,
  onJumpToPly,
}: {
  review: AiReview;
  /** The page's language, to decide whether the review needs labelling. */
  viewerLocale: Locale;
  onJumpToPly: (ply: number) => void;
}) {
  const t = useTranslations('sharedGames');
  const momentsByPly = useMemo(
    () => new Map(review.moments.map((m) => [m.ply, m])),
    [review.moments]
  );
  // A game has one review, in the language its author chose — so a viewer
  // reading in another language gets it anyway, and is told which it is.
  const reviewLanguage =
    review.locale === viewerLocale
      ? null
      : // A row written before a locale was retired would have no label; show
        // the raw tag rather than "undefined".
        (LOCALE_LABELS[review.locale as Locale] ?? review.locale);

  return (
    <div className="space-y-6">
      {reviewLanguage && (
        <p className="text-xs text-muted-foreground">
          {t('aiReview.languageNote', { language: reviewLanguage })}
        </p>
      )}

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
                  {/* The grade as chess notation (`?!` / `?` / `??`), the same
                      badge the board draws — its localized name rides along as
                      the accessible name / tooltip. */}
                  <MoveJudgmentBadge
                    judgment={moment.judgment}
                    label={t(`aiReview.judgments.${moment.judgment}`)}
                  />
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
