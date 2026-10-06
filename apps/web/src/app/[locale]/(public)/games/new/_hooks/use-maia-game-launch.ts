'use client';

import { useRef, useState } from 'react';

import type { EngineKind } from '@/lib/engines';
import { shouldWarnBeforeLargeDownload } from '@/lib/network/connection';

import { startMaiaGame } from '@/app/[locale]/(public)/games/new/_actions/startMaiaGame';
import type { MaiaCardMode } from '@/app/[locale]/(public)/games/new/_lib/maia-launch';

type Params = {
  /**
   * Navigate into the play route. Invoked only after consent + billing
   * succeed. `maiaChargeId` is the charge the game was started on (the
   * idempotency UUID the ledger row is keyed on), for the URL so the saved
   * game can remember what paid for it; null for the free engines and for
   * a Maia game the player's level made free.
   */
  navigateToGame: (maiaChargeId: string | null) => void;
  /**
   * The server-resolved Maia card mode. `free` skips the coin confirmation;
   * the server re-checks the level before settling, so a stale `free` here
   * never charges a coin unasked (see `chargeRequired` below).
   */
  maiaCardMode: MaiaCardMode;
};

/**
 * Orchestrates a `/games/new/*` game start: the coin-charge confirmation
 * dialog, the large-download consent dialog, the per-game Maia billing,
 * and the insufficient-balance modal. Shared by all three engine-bearing
 * forms (standard / position / pgn) so the payment flow has exactly one
 * implementation.
 *
 * Flow for a viewer starting a Maia game:
 *   start() → [coin-charge confirmation, unless the card is `free`] →
 *   [consent dialog on metered links] → startMaiaGame() → navigate on
 *   success, or open the point-info modal on insufficient funds.
 *
 * If the page rendered the card as `free` but the server finds the
 * player is not (the level is read at render time, so the page can be
 * stale), `startMaiaGame` answers `chargeRequired` instead of charging;
 * the confirmation dialog then opens and, once acknowledged, the start is
 * retried with the charge allowed.
 *
 * Non-Maia engines are free, so they skip the confirmation and go
 * straight to navigation.
 */
export function useMaiaGameLaunch({ navigateToGame, maiaCardMode }: Params) {
  const [isLoading, setIsLoading] = useState(false);
  const [coinConfirmOpen, setCoinConfirmOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [pointInfoOpen, setPointInfoOpen] = useState(false);
  // Stable across retries of one start attempt: a lost server-action
  // response replays the same idempotency key, so the charge never
  // doubles. Cleared once the billing has definitively landed.
  const gameIdRef = useRef<string | null>(null);
  // Whether the player has acknowledged the coin charge for this start
  // attempt. Only the confirmation dialog sets it; a `free` card never
  // opens that dialog, so a free start is sent with the charge disallowed.
  const chargeAcknowledgedRef = useRef(false);

  const resetAttempt = () => {
    gameIdRef.current = null;
    chargeAcknowledgedRef.current = false;
  };

  const proceed = async (engineKind: EngineKind) => {
    if (engineKind === 'maia') {
      if (!gameIdRef.current) gameIdRef.current = crypto.randomUUID();
      const chargeId = gameIdRef.current;
      const result = await startMaiaGame(chargeId, {
        allowCharge: chargeAcknowledgedRef.current,
      });
      if ('error' in result) {
        if (result.error === 'chargeRequired') {
          // The page said free, the server says payable: ask first.
          setCoinConfirmOpen(true);
          return;
        }
        setIsLoading(false);
        if (result.error === 'insufficient_balance') setPointInfoOpen(true);
        // signInRequired / banned / rateLimited: the Maia card is only
        // reachable for eligible signed-in users, so these are not
        // expected on the happy path — fail quietly without navigating.
        return;
      }
      resetAttempt();
      navigateToGame(result.billing === 'free' ? null : chargeId);
      return;
    }
    navigateToGame(null);
  };

  /**
   * Continue a start once the coin charge has been acknowledged (or was
   * never needed): warn about the large download on metered links, then
   * settle billing + navigate.
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
    // Below the free level every Maia game costs one coin; confirm the
    // charge before anything else. A free card and the non-Maia engines
    // skip the prompt.
    if (engineKind === 'maia' && maiaCardMode !== 'free') {
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
        chargeAcknowledgedRef.current = true;
        launchAfterConfirm('maia');
      },
      onCancel: () => {
        setCoinConfirmOpen(false);
        setIsLoading(false);
        resetAttempt();
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
        resetAttempt();
      },
    },
    pointInfoModal: {
      isOpen: pointInfoOpen,
      onClose: () => setPointInfoOpen(false),
    },
  };
}
