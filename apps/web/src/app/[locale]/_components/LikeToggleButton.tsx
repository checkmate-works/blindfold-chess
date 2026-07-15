'use client';

import { useState, useTransition } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai';

import { useAuthGuard } from '../_hooks/use-auth-guard';
import { AuthPromptModal } from './AuthPromptModal';

export type ToggleLikeResult = { liked: boolean; likeCount: number } | { error: string };

export type LikeToggleButtonSize = 'sm' | 'md' | 'lg';

export type LikeToggleButtonHitArea = 'none' | 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<LikeToggleButtonSize, { text: string; icon: string }> = {
  sm: { text: 'text-sm', icon: 'w-4 h-4' },
  md: { text: 'text-base', icon: 'w-5 h-5' },
  lg: { text: 'text-lg', icon: 'w-6 h-6' },
};

// Padding paired with an equal negative margin: the tap target grows while the
// rendered position of the icon/count stays pixel-identical, so surrounding
// layout is unaffected.
const HIT_AREA_CLASSES: Record<LikeToggleButtonHitArea, string> = {
  none: '',
  sm: 'p-1 -m-1',
  md: 'p-2 -m-2',
  lg: 'p-3 -m-3',
};

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
        className={`flex items-center gap-1 cursor-pointer ${SIZE_CLASSES[size].text} ${HIT_AREA_CLASSES[hitArea]} text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50`}
      >
        {display.liked ? (
          <AiFillHeart className={`${SIZE_CLASSES[size].icon} text-red-500`} />
        ) : (
          <AiOutlineHeart className={SIZE_CLASSES[size].icon} />
        )}
        {display.count > 0 && <span>{display.count}</span>}
      </button>
      {isModalOpen && <AuthPromptModal isOpen={isModalOpen} onClose={closeModal} />}
    </>
  );
}
