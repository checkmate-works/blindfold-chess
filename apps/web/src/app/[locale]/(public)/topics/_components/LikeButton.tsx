'use client';

import { useOptimistic, useTransition } from 'react';

import { useTranslations } from 'next-intl';

import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai';

type ToggleLikeAction = (
  postId: string,
  locale: string,
  topicKey: string
) => Promise<{ liked: boolean; likeCount: number } | { error: string }>;

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

      await toggleLikeAction(postId, locale, topicKey);
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
