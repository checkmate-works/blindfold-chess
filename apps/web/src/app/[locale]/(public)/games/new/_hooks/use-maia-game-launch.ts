'use client';

import { useState } from 'react';

import type { EngineKind } from '@/lib/engines';
import { shouldWarnBeforeLargeDownload } from '@/lib/network/connection';

type Params = {
  /** Navigate into the play route. Invoked only once any consent is given. */
  navigateToGame: () => void;
};

/**
 * Orchestrates a `/games/new/*` game start: the large-download consent
 * dialog for Maia, and the modal a locked Maia card opens. Shared by all
 * three engine-bearing forms (standard / position / pgn) so the flow has
 * exactly one implementation.
 *
 * Flow for a viewer starting a Maia game:
 *   start() → [consent dialog on metered links] → navigate.
 *
 * Nothing is settled server-side here. Whether the viewer may use Maia is
 * decided where it is enforced — the model download route (`canUseMaia`) —
 * and the selector only lets an unlocked card be chosen, so a start that
 * reaches this hook with Maia selected is one the server will serve.
 */
export function useMaiaGameLaunch({ navigateToGame }: Params) {
  const [isLoading, setIsLoading] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [lockedInfoOpen, setLockedInfoOpen] = useState(false);

  /**
   * Begin a game start. The caller must have already passed its own form
   * validation (the start button is disabled while invalid).
   */
  const start = (engineKind: EngineKind) => {
    setIsLoading(true);
    // Maia is the only engine with a multi-megabyte download; warn on
    // metered / slow links before doing anything else.
    if (engineKind === 'maia' && shouldWarnBeforeLargeDownload()) {
      setConsentOpen(true);
      return;
    }
    navigateToGame();
  };

  return {
    isLoading,
    start,
    /** Open the unlock modal — wired to the engine selector's locked card. */
    openLockedInfo: () => setLockedInfoOpen(true),
    consentDialog: {
      isOpen: consentOpen,
      onConfirm: () => {
        setConsentOpen(false);
        navigateToGame();
      },
      onCancel: () => {
        setConsentOpen(false);
        setIsLoading(false);
      },
    },
    lockedInfoModal: {
      isOpen: lockedInfoOpen,
      onClose: () => setLockedInfoOpen(false),
    },
  };
}
