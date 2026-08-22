'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaRobot } from 'react-icons/fa';

import type { AiReviewMomentComment, ReviewMoment } from '@/lib/ai-review/types';

import { formatAbsoluteDateTime } from '@/app/[locale]/(public)/topics/_lib/absolute-time';
import { CommentNodeLayout } from '@/app/[locale]/_components/CommentNodeLayout';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ReviewMomentFacts } from './ReviewMomentFacts';
import { ReviewPrincipleCallout } from './ReviewPrincipleCallout';

/**
 * The AI review's take on one move, rendered as a comment in that move's own
 * thread: same `CommentNodeLayout` skeleton, same avatar-name-timestamp header
 * and body typography as a human comment, so the coach reads as one more voice
 * in the discussion rather than as a separate widget.
 *
 * It collapses like any other root, which matters more here than in a human
 * thread: a review paragraph is the longest thing on a move, and a reader who
 * came to discuss the move wants it out of the way once read. What it does NOT
 * offer is like and reply — those act on a `game_comments` row, and this is a
 * projection of `game_ai_reviews`, which has no such identity and nothing to
 * reply to. The robot mark instead of an avatar is what tells a reader this
 * one is not a person.
 *
 * The prose stays PLAIN TEXT — no `GameCommentBody`, whose URL linkification
 * and move-reference buttons would let LLM output become interactive markup.
 * See `AiReviewPanel`'s TSDoc for that boundary.
 */
export function ReviewMomentComment({
  moment,
  comment,
  createdAt,
  locale,
}: {
  moment: ReviewMoment;
  /** The review's prose for this moment; absent when the LLM skipped it. */
  comment?: AiReviewMomentComment;
  /** When the review was generated — this "comment" has no time of its own. */
  createdAt: Date;
  locale: Locale;
}) {
  const t = useTranslations('sharedGames');
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <CommentNodeLayout
      id={`ai-review-moment-${moment.ply}`}
      toggle={{
        isCollapsed,
        onToggle: () => setIsCollapsed((prev) => !prev),
        // Its own labels: the thread's talk about collapsing REPLIES, and this
        // one has none — what folds away is the review of the move itself.
        ariaLabel: t(isCollapsed ? 'aiReview.expandAriaLabel' : 'aiReview.collapseAriaLabel'),
      }}
    >
      {/* Mirrors UserAvatar's `block` layout — same 32px circle, gap and name
          typography — with the AI Review's own robot mark in place of a face. */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <FaRobot className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="font-medium text-foreground">{t('aiReview.tab')}</span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <time dateTime={createdAt.toISOString()}>
              {formatAbsoluteDateTime(createdAt, locale, 'short')}
            </time>
          </div>
        </div>
      </div>

      {/* Collapsed leaves the header alone, exactly as a reply-less root does
          in the thread: who spoke and when stays, what they said folds away. */}
      {!isCollapsed && (
        <>
          <ReviewMomentFacts moment={moment} />

          {comment && (
            <>
              <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground">
                {comment.explanation}
              </p>
              <ReviewPrincipleCallout principle={comment.principle} />
              <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-muted-foreground">
                {comment.lesson}
              </p>
            </>
          )}
        </>
      )}
    </CommentNodeLayout>
  );
}
