'use client';

import { useEffect, useRef, useState } from 'react';

import type { MoveSquares } from '@/lib/board/move-squares';

/**
 * How long the transient submit-feedback chip stays mounted. Matches the
 * total length of the `feedback-pop` CSS keyframe in `globals.css` —
 * after this window the chip has fully faded out, so unmounting it
 * leaves no visual residue while resetting the React state for the next
 * submit (which gives a fresh `key` and a fresh animation cycle).
 */
const FEEDBACK_DURATION_MS = 1200;

/**
 * Delay before the opponent's auto-reply is revealed on the board after a
 * correct move. The player's move lands immediately; the reply follows a beat
 * later, highlighted — so the two read as distinct moves instead of the reply
 * appearing simultaneously (which made it unclear which piece the opponent
 * moved). Mirrors the pace of the preview replay (`PuzzleSolutionReplay`), and
 * kept under `AUTO_NAVIGATE_DELAY_MS` so a solving line that ends on an
 * opponent reply still shows that reply before the result-page navigation.
 */
const OPPONENT_REPLY_REVEAL_MS = 700;

/** `incorrect` for a rejected move; `correct` for an accepted non-final
 *  move (a plain positive ring while the opponent's reply is pending);
 *  `solved` for the puzzle's final correct move — the celebratory chip that
 *  fills the ~1s window before the result-page navigation. */
export type PuzzleFeedbackKind = 'incorrect' | 'correct' | 'solved';

/** Where the move was entered — the feedback surfaces next to that input:
 *  on the board for a drag/click, at the panel otherwise. */
export type PuzzleFeedbackSource = 'board' | 'input';

export type PuzzleFeedback = {
  /**
   * Incremented on every flash so the chip's React `key` changes — that
   * re-mounts the element and replays the CSS animation when two flashes
   * fire back-to-back. Without the counter the second submit would silently
   * keep the existing element and skip the animation.
   */
  count: number;
  source: PuzzleFeedbackSource;
  kind: PuzzleFeedbackKind;
};

type BoardView = {
  fen: string;
  lastMove: MoveSquares | null;
};

/**
 * The puzzle session's transient presentation state machine: the
 * submit-feedback chip (auto-cleared after its CSS animation) and the board
 * view whose opponent reply is revealed a beat after the player's move.
 *
 * `boardView` is deliberately decoupled from the session's logical
 * `currentFen` so the opponent's reply can land later, highlighted, instead
 * of both moves painting at once; `isOpponentReplying` is true during that
 * window so callers can lock move input against the mid-transition position.
 */
export function usePuzzleBoardFeedback(initialFen: string) {
  const [feedback, setFeedback] = useState<PuzzleFeedback | null>(null);
  const feedbackCountRef = useRef(0);

  const [boardView, setBoardView] = useState<BoardView>({ fen: initialFen, lastMove: null });
  const [isOpponentReplying, setIsOpponentReplying] = useState(false);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear a pending reply-reveal timer on unmount (e.g. the solve navigation
  // tears the page down mid-reveal) so it never fires against a gone component.
  useEffect(() => {
    return () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    };
  }, []);

  // Unmount the feedback chip once its CSS animation has completed. Keying off
  // `feedback.count` (rather than the whole object) ensures the timer resets on
  // every new flash, so back-to-back flashes each get the full duration on
  // screen instead of the latest one being cut short by the previous timer.
  useEffect(() => {
    if (feedback === null) return;
    const timer = setTimeout(() => setFeedback(null), FEEDBACK_DURATION_MS);
    return () => clearTimeout(timer);
  }, [feedback]);

  function flashFeedback(kind: PuzzleFeedbackKind, source: PuzzleFeedbackSource) {
    feedbackCountRef.current += 1;
    setFeedback({ count: feedbackCountRef.current, source, kind });
  }

  function clearFeedback() {
    setFeedback(null);
  }

  /** Paint the player's accepted move right away (highlighted). */
  function showPlayerMove(fen: string, lastMove: MoveSquares) {
    setBoardView({ fen, lastMove });
  }

  /**
   * Reveal the opponent's reply after `OPPONENT_REPLY_REVEAL_MS`, locking
   * input until it lands. On a non-final move the intermediate "correct"
   * feedback is dropped as the reply lands; the solved feedback instead
   * persists until the result-page navigation (`keepFeedback: true`).
   */
  function revealOpponentReply(opts: {
    fenAfterReply: string;
    reply: MoveSquares;
    keepFeedback: boolean;
  }) {
    setIsOpponentReplying(true);
    if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    replyTimerRef.current = setTimeout(() => {
      setBoardView({
        fen: opts.fenAfterReply,
        lastMove: { from: opts.reply.from, to: opts.reply.to },
      });
      setIsOpponentReplying(false);
      replyTimerRef.current = null;
      if (!opts.keepFeedback) setFeedback(null);
    }, OPPONENT_REPLY_REVEAL_MS);
  }

  return {
    feedback,
    flashFeedback,
    clearFeedback,
    boardView,
    isOpponentReplying,
    showPlayerMove,
    revealOpponentReply,
  };
}
