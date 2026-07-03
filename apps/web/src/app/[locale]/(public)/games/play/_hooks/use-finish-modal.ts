import { useEffect, useRef, useState } from 'react';

/**
 * Open/close state for the game-finished modal (Result / Game Review /
 * Kata), including its auto-open-once rule: it opens by itself when a game
 * reaches a terminal result in live play; afterwards — and when reviewing a
 * game opened from the list (`?finished=1`) — it is only reopened manually
 * (the "Next action" button). Dismissing leaves the player on the finished
 * board.
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
  const finishAutoOpenedRef = useRef(false);

  useEffect(() => {
    if (finishAutoOpenedRef.current || isInitializing) return;
    if (isFinished && !isFinishedView) {
      finishAutoOpenedRef.current = true;
      setFinishModalOpen(true);
    }
  }, [isFinished, isFinishedView, isInitializing]);

  return { finishModalOpen, setFinishModalOpen };
}
