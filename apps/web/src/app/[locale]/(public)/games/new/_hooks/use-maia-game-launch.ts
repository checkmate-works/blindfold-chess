'use client';

import { useRef, useState } from 'react';

import type { EngineKind } from '@/lib/engines';
import { shouldWarnBeforeLargeDownload } from '@/lib/network/connection';

import { startMaiaGame } from '@/app/[locale]/(public)/games/new/_actions/startMaiaGame';

type Params = {
  /** Navigate into the play route. Invoked only after consent + charge succeed. */
  navigateToGame: () => void;
};

/**
 * Orchestrates a `/games/new/*` game start: the coin-charge confirmation
 * dialog, the large-download consent dialog, the per-game Maia coin
 * charge, and the insufficient-balance modal. Shared by all three
 * engine-bearing forms (standard / position / pgn) so the payment flow
 * has exactly one implementation.
 *
 * Flow for a viewer starting a Maia game:
 *   start() → coin-charge confirmation → [consent dialog on metered
 *   links] → startMaiaGame() charge → navigate on success, or open the
 *   point-info modal on insufficient funds.
 *
 * Non-Maia engines are free, so they skip the confirmation and go
 * straight to navigation.
 */
export function useMaiaGameLaunch({ navigateToGame }: Params) {
  const [isLoading, setIsLoading] = useState(false);
  const [coinConfirmOpen, setCoinConfirmOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [pointInfoOpen, setPointInfoOpen] = useState(false);
  // Stable across retries of one start attempt: a lost server-action
  // response replays the same idempotency key, so the charge never
  // doubles. Cleared once the charge has definitively landed.
  const gameIdRef = useRef<string | null>(null);

  const proceed = async (engineKind: EngineKind) => {
    if (engineKind === 'maia') {
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
   * Continue a start once the coin charge has been acknowledged (or was
   * never needed): warn about the large download on metered links, then
   * charge + navigate.
   */
  const launchAfterConfirm = (engineKind: EngineKind) => {
    // Maia is the only engine with a multi-megabyte download; warn on
    // metered / slow links before doing anything else.
    if (engineKind === 'maia' && shouldWarnBeforeLargeDownload()) {
      setConsentOpen(true);
      return;
    }
    void proceed(engineKind);
  };

  /**
   * Begin a game start. The caller must have already passed its own form
   * validation (the start button is disabled while invalid).
   */
  const start = (engineKind: EngineKind) => {
    setIsLoading(true);
    // Every Maia game costs one coin; confirm the charge before anything
    // else. Non-Maia engines are free and skip the prompt.
    if (engineKind === 'maia') {
      setCoinConfirmOpen(true);
      return;
    }
    launchAfterConfirm(engineKind);
  };

  return {
    isLoading,
    start,
    /** Open the point-info modal — wired to the engine selector's locked card. */
    openPointInfo: () => setPointInfoOpen(true),
    coinConfirmDialog: {
      isOpen: coinConfirmOpen,
      onConfirm: () => {
        setCoinConfirmOpen(false);
        launchAfterConfirm('maia');
      },
      onCancel: () => {
        setCoinConfirmOpen(false);
        setIsLoading(false);
      },
    },
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
