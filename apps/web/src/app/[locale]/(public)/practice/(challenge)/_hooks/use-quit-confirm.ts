'use client';

import { useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

type Args = {
  locale: string;
  /**
   * Module slug used to construct the redirect URL on quit confirm
   * (`/${locale}/practice/${moduleSlug}/challenge`). Examples:
   * 'legal-moves', 'route-planner', 'diagonal-quiz', 'square-colors',
   * 'coordinate-quiz', 'quadrants', 'board-symmetry'.
   */
  moduleSlug: string;
  isPaused: boolean;
  togglePause: () => void;
};

type Return = {
  showQuitModal: boolean;
  handleQuitRequest: () => void;
  handleQuitConfirm: () => void;
  handleQuitCancel: () => void;
};

/**
 * Shared quit-confirmation state and handlers for challenge sessions.
 *
 * Behavior:
 * - `handleQuitRequest`: pauses the session (if not already paused) and opens
 *   the modal.
 * - `handleQuitConfirm`: navigates to the module's challenge setup page.
 *   The modal stays mounted; the consumer unmounts naturally on navigation.
 * - `handleQuitCancel`: closes the modal and resumes the session if it was
 *   paused by the gate.
 *
 * The actual `<QuitConfirmModal>` rendering remains the consumer's
 * responsibility — this hook only owns the boolean and the callback wiring.
 */
export function useQuitConfirm({ locale, moduleSlug, isPaused, togglePause }: Args): Return {
  const router = useRouter();
  const [showQuitModal, setShowQuitModal] = useState(false);

  const handleQuitRequest = useCallback(() => {
    if (!isPaused) togglePause();
    setShowQuitModal(true);
  }, [isPaused, togglePause]);

  const handleQuitConfirm = useCallback(() => {
    router.push(`/${locale}/practice/${moduleSlug}/challenge`);
  }, [router, locale, moduleSlug]);

  const handleQuitCancel = useCallback(() => {
    setShowQuitModal(false);
    if (isPaused) togglePause();
  }, [isPaused, togglePause]);

  return {
    showQuitModal,
    handleQuitRequest,
    handleQuitConfirm,
    handleQuitCancel,
  };
}
