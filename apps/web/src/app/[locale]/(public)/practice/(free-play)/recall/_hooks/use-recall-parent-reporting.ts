'use client';

import { useEffect } from 'react';

import type { RecallFeedback } from '../_components/RecallClient';

type Options = {
  /**
   * The title-form feedback, passed as its two primitive fields rather than as
   * an assembled object: the object would be a fresh reference every render and
   * so re-fire the report on every render, whereas a tone + text pair is
   * value-compared by the effect's dependency check. Both null = nothing to show.
   */
  feedbackTone: RecallFeedback['tone'] | null;
  feedbackText: string | null;
  isCompleted: boolean;
  onFeedbackChange?: (feedback: RecallFeedback | null) => void;
  onCompletedChange?: (completed: boolean) => void;
};

/**
 * Push the two pieces of session state the page owner needs up to it.
 *
 * The recall session renders inside a page that owns chrome around it — the
 * `PageTitle` slot (which shows live move feedback, the way the play screen
 * shows its move status as the H1) and the help tour (whose targets vanish once
 * the summary replaces the input/settings/moves panels). Neither can be lifted
 * into the session component, and neither belongs in its render path, so both
 * travel back out as callbacks.
 *
 * Grouped in one hook because they are the same concern — "tell the page owner
 * what changed" — and because two bare effects in the session body read as
 * unrelated bookkeeping rather than as one interface to the parent.
 */
export function useRecallParentReporting({
  feedbackTone,
  feedbackText,
  isCompleted,
  onFeedbackChange,
  onCompletedChange,
}: Options): void {
  useEffect(() => {
    onFeedbackChange?.(
      feedbackTone && feedbackText ? { tone: feedbackTone, text: feedbackText } : null
    );
  }, [onFeedbackChange, feedbackTone, feedbackText]);

  useEffect(() => {
    onCompletedChange?.(isCompleted);
  }, [onCompletedChange, isCompleted]);
}
