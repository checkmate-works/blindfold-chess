'use client';

import { useOptimistic, useState, useTransition } from 'react';

import { useRouter } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { toggleFollow } from '../_actions/toggleFollow';

type Props = {
  targetUsername: string;
  locale: string;
  initialFollowing: boolean;
  isAuthenticated: boolean;
};

export function FollowButton({ targetUsername, locale, initialFollowing, isAuthenticated }: Props) {
  const t = useTranslations('publicProfile');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticFollowing, setOptimisticFollowing] = useOptimistic(initialFollowing);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }

    startTransition(async () => {
      setOptimisticFollowing(!optimisticFollowing);
      await toggleFollow(targetUsername, locale);
    });
  };

  const buttonText = optimisticFollowing
    ? isHovered
      ? t('unfollow')
      : t('following')
    : t('follow');

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isPending}
      className={`rounded-full px-5 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer ${
        optimisticFollowing
          ? isHovered
            ? 'border border-red-300 text-red-500 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-950'
            : 'border border-border text-foreground'
          : 'bg-foreground text-background hover:opacity-90'
      }`}
    >
      {buttonText}
    </button>
  );
}
