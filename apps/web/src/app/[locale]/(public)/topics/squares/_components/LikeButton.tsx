'use client';

import { useOptimistic, useTransition } from 'react';

import { useTranslations } from 'next-intl';

import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai';

import { toggleLike } from '../[square]/posts/[postId]/_actions/toggleLike';

type Props = {
  postId: string;
  locale: string;
  square: string;
  initialLikeCount: number;
  initialLikedByMe: boolean;
};

export function LikeButton({ postId, locale, square, initialLikeCount, initialLikedByMe }: Props) {
  const t = useTranslations('topics.squares');
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    { liked: initialLikedByMe, count: initialLikeCount },
    (_current, newState: { liked: boolean; count: number }) => newState
  );

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    startTransition(async () => {
      const newLiked = !optimistic.liked;
      const newCount = optimistic.count + (newLiked ? 1 : -1);
      setOptimistic({ liked: newLiked, count: newCount });

      await toggleLike(postId, locale, square);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={optimistic.liked ? t('unlike') : t('like')}
      className="flex items-center gap-1 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
    >
      {optimistic.liked ? (
        <AiFillHeart className="w-4 h-4 text-red-500" />
      ) : (
        <AiOutlineHeart className="w-4 h-4" />
      )}
      {optimistic.count > 0 && <span>{optimistic.count}</span>}
    </button>
  );
}
