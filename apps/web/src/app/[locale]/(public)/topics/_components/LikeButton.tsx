'use client';

import { useState, useTransition } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai';

import { AuthPromptModal } from '@/app/[locale]/_components/AuthPromptModal';
import { useAuthGuard } from '@/app/[locale]/_hooks/use-auth-guard';

import type { ToggleLikeAction } from '../_lib/action-types';

type Props = {
  postId: string;
  locale: string;
  topicKey: string;
  initialLikeCount: number;
  initialLikedByMe: boolean;
  toggleLikeAction: ToggleLikeAction;
  i18nNamespace: string;
};

export function LikeButton({
  postId,
  locale,
  topicKey,
  initialLikeCount,
  initialLikedByMe,
  toggleLikeAction,
  i18nNamespace,
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
          const result = await toggleLikeAction(postId, locale, topicKey);

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
