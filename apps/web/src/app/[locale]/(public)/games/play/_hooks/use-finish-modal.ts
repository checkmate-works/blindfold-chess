import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * How long the finished board is left alone before the modal covers it.
 *
 * The modal used to open in the same frame the game ended, so the mating move —
 * the position the player had been holding in their head for the whole game —
 * was on screen for one frame before a dialog landed on top of it. Long enough
 * to read the board and find the end-of-game badge; short enough that it reads
 * as a beat rather than as the app hanging.
 */
export const FINISH_MODAL_AUTO_OPEN_DELAY_MS = 1400;

/**
 * Open/close state for the game-finished modal (Result / Game Review /
 * Kata), including its auto-open-once rule: it opens by itself a beat after a
 * game reaches a terminal result in live play (see
 * {@link FINISH_MODAL_AUTO_OPEN_DELAY_MS}); afterwards — and when reviewing a
 * game opened from the list (`?finished=1`) — it is only reopened manually
 * (the "Next action" button). Dismissing leaves the player on the finished
 * board.
 *
 * The two effects are deliberately separate. The first decides *whether* this
 * game auto-opens and claims that right once; the second owns the timer, keyed
 * only on its own pending flag. Scheduling inside the first would tie the timer
 * to `isFinished` / `isInitializing`, and any change to those mid-delay would
 * run the cleanup, cancel the timer, and — the auto-open already claimed — leave
 * the modal that never opens.
 */
export function useFinishModal({
  isFinished,
  isFinishedView,
  isInitializing,
}: {
  isFinished: boolean;
  isFinishedView: boolean;
  isInitializing: boolean;
}) {
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [autoOpenPending, setAutoOpenPending] = useState(false);
  const finishAutoOpenedRef = useRef(false);

  useEffect(() => {
    if (finishAutoOpenedRef.current || isInitializing) return;
    if (isFinished && !isFinishedView) {
      finishAutoOpenedRef.current = true;
      setAutoOpenPending(true);
    }
  }, [isFinished, isFinishedView, isInitializing]);

  useEffect(() => {
    if (!autoOpenPending) return;
    const timer = setTimeout(() => {
      setAutoOpenPending(false);
      setFinishModalOpen(true);
    }, FINISH_MODAL_AUTO_OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [autoOpenPending]);

  // Any deliberate open/close supersedes the scheduled one. Without this, a
  // player who opened the modal from the overlay and dismissed it inside the
  // delay window would have it thrown back at them when the timer fired.
  const setModalOpen = useCallback((open: boolean) => {
    setAutoOpenPending(false);
    setFinishModalOpen(open);
  }, []);

  return { finishModalOpen, setFinishModalOpen: setModalOpen };
}
