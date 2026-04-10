'use client';

import { useState, useTransition } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai';

import { AuthPromptModal } from '@/app/[locale]/_components/AuthPromptModal';
import { useAuthGuard } from '@/app/[locale]/_hooks/use-auth-guard';

type ToggleLikeAction = (
  positionId: string,
  locale: string
) => Promise<{ liked: boolean; likeCount: number } | { error: string }>;

type Props = {
  positionId: string;
  locale: string;
  initialLikeCount: number;
  initialLikedByMe: boolean;
  toggleLikeAction: ToggleLikeAction;
};

export function PositionLikeButton({
  positionId,
  locale,
  initialLikeCount,
  initialLikedByMe,
  toggleLikeAction,
}: Props) {
  const t = useTranslations('practice.positionMemory');
  const [isPending, startTransition] = useTransition();
  const { guardAction, isModalOpen, closeModal } = useAuthGuard();

  const [confirmed, setConfirmed] = useState({
    liked: initialLikedByMe,
    count: initialLikeCount,
  });

  const [optimistic, setOptimistic] = useState<{
    liked: boolean;
    count: number;
  } | null>(null);

  const display = optimistic ?? confirmed;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    guardAction(() => {
      startTransition(async () => {
        const newLiked = !display.liked;
        const newCount = display.count + (newLiked ? 1 : -1);
        setOptimistic({ liked: newLiked, count: newCount });

        try {
          const result = await toggleLikeAction(positionId, locale);

          if ('error' in result) {
            setOptimistic(null);
            return;
          }

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
        className="flex items-center gap-1 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        {display.liked ? (
          <AiFillHeart className="w-4 h-4 text-red-500" />
        ) : (
          <AiOutlineHeart className="w-4 h-4" />
        )}
        {display.count > 0 && <span>{display.count}</span>}
      </button>
      {isModalOpen && <AuthPromptModal isOpen={isModalOpen} onClose={closeModal} />}
    </>
  );
}
