'use client';

import { useState, useTransition } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai';

import { AuthPromptModal } from '@/app/[locale]/_components/AuthPromptModal';
import { useAuthGuard } from '@/app/[locale]/_hooks/use-auth-guard';

import { toggleGameCommentLikeAction } from '../_actions/game-comments';

type Props = {
  commentId: string;
  locale: string;
  initialLikeCount: number;
  initialLikedByMe: boolean;
};

/**
 * Heart toggle on a game comment — same optimistic + auth-gated behavior as the
 * topics `LikeButton`, but bound to the game-comment like action (no topicKey).
 * Guests get the sign-up prompt instead of a like.
 */
export function GameCommentLikeButton({
  commentId,
  locale,
  initialLikeCount,
  initialLikedByMe,
}: Props) {
  const t = useTranslations('sharedGames.comments');
  const [isPending, startTransition] = useTransition();
  const { guardAction, isModalOpen, closeModal } = useAuthGuard();

  const [confirmed, setConfirmed] = useState({
    liked: initialLikedByMe,
    count: initialLikeCount,
  });
  const [optimistic, setOptimistic] = useState<{ liked: boolean; count: number } | null>(null);
  const display = optimistic ?? confirmed;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    guardAction(() => {
      startTransition(async () => {
        const newLiked = !display.liked;
        setOptimistic({ liked: newLiked, count: display.count + (newLiked ? 1 : -1) });
        try {
          const result = await toggleGameCommentLikeAction(commentId, locale);
          if ('error' in result) {
            setOptimistic(null);
            return;
          }
          setConfirmed({ liked: result.liked, count: result.likeCount });
        } catch {
          // network error — fall through to rollback
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
