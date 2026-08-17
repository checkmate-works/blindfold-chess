'use client';

import { useEffect, useId, useMemo, useState } from 'react';

import { SUPPORTED_LOCALES } from '@/config';
import { LOCALE_LABELS } from '@/i18n/locale-labels';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaRobot } from 'react-icons/fa';

import type { AiReview, AiReviewGenerationOffer } from '@/lib/ai-review/types';
import { MOVE_JUDGMENTS } from '@/lib/games/analysis/types';
import type { MoveJudgment } from '@/lib/games/analysis/types';
import { MoveJudgmentBadge } from '@/lib/games/evaluation';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useAiReviewGeneration } from '../_hooks/use-ai-review-generation';
import { AiReviewUpsell } from './AiReviewUpsell';
import { ReviewMomentCard } from './ReviewMomentCard';

type Props = {
  gameId: string;
  locale: Locale;
  moves: string[];
  startingFen: string | null;
  /**
   * The review the page currently holds: the server-resolved one, or the one
   * generated during this session (see `onReviewGenerated` — the page keeps it
   * across this panel's unmounts, so it must be read from there rather than
   * from the server prop, which stays null until the next server render).
   *
   * Null when no review exists yet — in which case this panel is mounted only
   * for a viewer with a `generation` offer (see `SharedGameDetailView`).
   */
  initialReview: AiReview | null;
  /**
   * What this viewer may do about generating a review, or null when they may
   * do nothing — a reader of someone else's review, or a deployment with no
   * LLM key. Null renders no generation UI at all, not a locked one.
   */
  generation: AiReviewGenerationOffer | null;
  /**
   * Jump the replay board to the position after the given ply — the board that
   * carries both that move's grade badge and the engine arrow for what the
   * review would have played instead.
   */
  onJumpToPly: (ply: number) => void;
  /**
   * Fires once when a generation started here completes. This panel is where a
   * brand-new review comes into existence, and it is not where the review can
   * be kept: the page above marks graded moves on the board, and — because the
   * tab is conditionally rendered — this panel is destroyed the moment the
   * author looks at another tab. Handing the review up is what makes it
   * survive both. Not called for `initialReview`, which the page already has.
   */
  onReviewGenerated?: (review: AiReview) => void;
};

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
  generation,
  onJumpToPly,
  onReviewGenerated,
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

  // Raise a just-generated review to the page. 'done' is terminal, so this
  // fires once per generation and never for a cached `initialReview`.
  const generated = state.phase === 'done' ? state.review : null;
  useEffect(() => {
    if (generated) onReviewGenerated?.(generated);
  }, [generated, onReviewGenerated]);

  if (review) {
    return <ReviewBody review={review} viewerLocale={locale} onJumpToPly={onJumpToPly} />;
  }

  // No review and nothing this viewer can do about it. The page keeps the tab
  // out of their reach, so this is the stale-page case, not a normal one.
  if (generation === null) {
    return <p className="py-6 text-sm text-muted-foreground">{t('aiReview.notGenerated')}</p>;
  }

  // Ahead of the in-flight phases below: without an entitlement, generation
  // never starts, so there is no state for those phases to be in.
  if (generation.kind === 'subscription_required') {
    return <AiReviewUpsell locale={locale} />;
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

  // One row per LLM comment joined to its engine moment. A comment whose
  // moment is missing is dropped — the numbers are the authority, and prose
  // about a moment that isn't there has nothing to anchor to.
  const momentRows = useMemo(
    () =>
      review.content.momentComments.flatMap((comment) => {
        const moment = momentsByPly.get(comment.ply);
        return moment ? [{ comment, moment }] : [];
      }),
    [review.content.momentComments, momentsByPly]
  );

  // Grades that actually occur, in severity order, with their counts — the
  // filter offers exactly what there is to filter, never an empty bucket.
  const gradeCounts = useMemo(() => {
    const counts = new Map<MoveJudgment, number>();
    for (const { moment } of momentRows) {
      counts.set(moment.judgment, (counts.get(moment.judgment) ?? 0) + 1);
    }
    return MOVE_JUDGMENTS.flatMap((judgment) => {
      const count = counts.get(judgment);
      return count === undefined ? [] : [{ judgment, count }];
    });
  }, [momentRows]);

  // Excluded rather than included, so the default (an empty set) means "show
  // everything" without having to be recomputed when the review changes.
  const [excluded, setExcluded] = useState<ReadonlySet<MoveJudgment>>(() => new Set());
  const toggleGrade = (judgment: MoveJudgment) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (!next.delete(judgment)) next.add(judgment);
      return next;
    });
  const visibleRows = momentRows.filter(({ moment }) => !excluded.has(moment.judgment));

  // A single-grade review has nothing to separate, so the filter row would be
  // a control that can only hide the whole list.
  const showGradeFilter = gradeCounts.length > 1;

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

      {momentRows.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            {t('aiReview.sections.keyMoments')}
          </h3>

          {/* Grade filter — the notation IS the control, so each chip is the
              board's own badge plus how many moves earned it. */}
          {showGradeFilter && (
            <div
              role="group"
              aria-label={t('aiReview.gradeFilterLabel')}
              className="flex flex-wrap gap-2"
            >
              {gradeCounts.map(({ judgment, count }) => {
                const label = t(`aiReview.judgments.${judgment}`);
                const active = !excluded.has(judgment);
                return (
                  <button
                    key={judgment}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleGrade(judgment)}
                    title={label}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      active
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground opacity-50 hover:opacity-80'
                    }`}
                  >
                    <MoveJudgmentBadge judgment={judgment} size="sm" />
                    <span className="sr-only">{label}</span>
                    <span className="font-mono">{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {visibleRows.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('aiReview.noMomentsForGrades')}</p>
          )}

          {visibleRows.map(({ comment, moment }) => (
            <ReviewMomentCard
              key={comment.ply}
              moment={moment}
              comment={comment}
              onJumpToPly={onJumpToPly}
            />
          ))}
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
