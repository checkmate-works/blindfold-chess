'use client';

import { useRef, useState } from 'react';

import type { EngineKind } from '@/lib/engines';
import { shouldWarnBeforeLargeDownload } from '@/lib/network/connection';
import type { MaiaEngineAccess } from '@/lib/users/can-use-maia';

import { startMaiaGame } from '@/app/[locale]/(public)/games/new/_actions/startMaiaGame';

type Params = {
  maiaAccess: MaiaEngineAccess;
  /** Navigate into the play route. Invoked only after consent + charge succeed. */
  navigateToGame: () => void;
};

/**
 * Orchestrates a `/games/new/*` game start: the large-download consent
 * dialog, the per-game Maia point charge, and the insufficient-balance
 * modal. Shared by all three engine-bearing forms (standard / position /
 * pgn) so the payment flow has exactly one implementation.
 *
 * Flow for a non-exempt viewer starting a Maia game:
 *   start() → [consent dialog on metered links] → startMaiaGame() charge →
 *   navigate on success, or open the point-info modal on insufficient funds.
 *
 * Non-Maia engines and Maia-exempt viewers skip straight to navigation.
 */
export function useMaiaGameLaunch({ maiaAccess, navigateToGame }: Params) {
  const [isLoading, setIsLoading] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [pointInfoOpen, setPointInfoOpen] = useState(false);
  // Stable across retries of one start attempt: a lost server-action
  // response replays the same idempotency key, so the charge never
  // doubles. Cleared once the charge has definitively landed.
  const gameIdRef = useRef<string | null>(null);

  const proceed = async (engineKind: EngineKind) => {
    if (engineKind === 'maia' && !maiaAccess.exempt) {
      if (!gameIdRef.current) gameIdRef.current = crypto.randomUUID();
      const result = await startMaiaGame(gameIdRef.current);
      if (!result.ok) {
        setIsLoading(false);
        if (result.error === 'insufficient_balance') setPointInfoOpen(true);
        // signInRequired / banned / rateLimited: the Maia card is only
        // reachable for eligible signed-in users, so these are not
        // expected on the happy path — fail quietly without navigating.
        return;
      }
      gameIdRef.current = null;
    }
    navigateToGame();
  };

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
    void proceed(engineKind);
  };

  return {
    isLoading,
    start,
    /** Open the point-info modal — wired to the engine selector's locked card. */
    openPointInfo: () => setPointInfoOpen(true),
    consentDialog: {
      isOpen: consentOpen,
      onConfirm: () => {
        setConsentOpen(false);
        void proceed('maia');
      },
      onCancel: () => {
        setConsentOpen(false);
        setIsLoading(false);
      },
    },
    pointInfoModal: {
      isOpen: pointInfoOpen,
      onClose: () => setPointInfoOpen(false),
    },
  };
}
