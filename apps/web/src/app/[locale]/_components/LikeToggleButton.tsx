'use client';

import { useState, useTransition } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai';

import { useAuthGuard } from '../_hooks/use-auth-guard';
import { AuthPromptModal } from './AuthPromptModal';
import { EngagementCounter, engagementIconClass } from './EngagementCounter';
import type { EngagementCounterHitArea, EngagementCounterSize } from './EngagementCounter';

export type ToggleLikeResult = { liked: boolean; likeCount: number } | { error: string };

export type LikeToggleButtonSize = EngagementCounterSize;

export type LikeToggleButtonHitArea = EngagementCounterHitArea;

type Props = {
  initialLikeCount: number;
  initialLikedByMe: boolean;
  /** Bound like Server Action; the wrapper decides which endpoint this hits. */
  onToggle: () => Promise<ToggleLikeResult>;
  /** Namespace containing the `like` / `unlike` aria-label keys. */
  i18nNamespace: string;
  size?: LikeToggleButtonSize;
  hitArea?: LikeToggleButtonHitArea;
};

/**
 * Shared heart toggle used by every like surface (home timeline, topics,
 * game comments, puzzles, ...). Owns the optimistic-update flow and the
 * guest auth prompt; wrappers only bind the concrete Server Action.
 */
export function LikeToggleButton({
  initialLikeCount,
  initialLikedByMe,
  onToggle,
  i18nNamespace,
  size = 'md',
  hitArea = 'none',
}: Props) {
  const t = useTranslations(i18nNamespace);
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

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label={display.liked ? t('unlike') : t('like')}
        className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        <EngagementCounter
          icon={
            display.liked ? (
              <AiFillHeart className={`${engagementIconClass(size)} text-red-500`} />
            ) : (
              <AiOutlineHeart className={engagementIconClass(size)} />
            )
          }
          count={display.count}
          size={size}
          hitArea={hitArea}
        />
      </button>
      {isModalOpen && <AuthPromptModal isOpen={isModalOpen} onClose={closeModal} />}
    </>
  );
}
