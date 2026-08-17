'use client';

import { useState, useTransition } from 'react';

import type { ToggleLikeResult } from '@/lib/db/like-actions';

import { useAuthGuard } from './use-auth-guard';

export type { ToggleLikeResult };

type Options = {
  initialLikeCount: number;
  initialLikedByMe: boolean;
  /** Bound like Server Action; the caller decides which endpoint this hits. */
  onToggle: () => Promise<ToggleLikeResult>;
};

/**
 * Optimistic-update + guest-auth-guard state machine shared by every like
 * surface (heart icon, full-width CTA, ...). Extracted out of
 * `LikeToggleButton` so bespoke like UIs can reuse the same rollback/guard
 * behavior instead of re-deriving it.
 */
export function useLikeToggle({ initialLikeCount, initialLikedByMe, onToggle }: Options) {
  const [isPending, startTransition] = useTransition();
  const { guardAction, isModalOpen, closeModal } = useAuthGuard();

  // Confirmed state: latest value returned by the server, or initial value
  const [confirmed, setConfirmed] = useState({
    liked: initialLikedByMe,
    count: initialLikeCount,
  });

  // Temporary state used only during optimistic updates
  const [optimistic, setOptimistic] = useState<{
    liked: boolean;
    count: number;
  } | null>(null);

  // Display value: use optimistic value during updates, otherwise confirmed value
  const display = optimistic ?? confirmed;

  const toggle = () => {
    guardAction(() => {
      startTransition(async () => {
        // Optimistic update: reflect in UI immediately
        const newLiked = !display.liked;
        const newCount = display.count + (newLiked ? 1 : -1);
        setOptimistic({ liked: newLiked, count: newCount });

        try {
          const result = await onToggle();

          if ('error' in result) {
            // On error: rollback optimistic update
            setOptimistic(null);
            return;
          }

          // On success: update state with server-confirmed values
          setConfirmed({ liked: result.liked, count: result.likeCount });
        } catch {
          // Network error etc.: rollback
        } finally {
          setOptimistic(null);
        }
      });
    });
  };

  return {
    liked: display.liked,
    count: display.count,
    isPending,
    toggle,
    isModalOpen,
    closeModal,
  };
}
