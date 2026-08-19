'use client';

import { useEffect } from 'react';

import { useLatestRef } from '@blindfold-chess/features/common/client';

/**
 * Bind ←/→ to stepping a board through its ply list.
 *
 * The handlers are read through a ref so the window listener is registered
 * once for the life of the component. Re-subscribing on every change of the
 * bound ply — which is what a plain dependency array does here — swaps the
 * listener on each arrow press, and the arrow keys are exactly the input a
 * reader holds down.
 *
 * Clamping stays with the caller: one viewer clamps against its line's length,
 * another delegates to a `goTo` that already knows its bounds, and folding
 * both into this hook would mean handing it a range it does not otherwise
 * need.
 */
export function usePlyKeyboardNav(handlers: { onPrev: () => void; onNext: () => void }): void {
  const handlersRef = useLatestRef(handlers);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        handlersRef.current.onPrev();
      } else if (e.key === 'ArrowRight') {
        handlersRef.current.onNext();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlersRef]);
}
