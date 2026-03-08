'use client';

import { useOptimistic, useState, useTransition } from 'react';

import { useTranslations } from 'next-intl';

import { toggleFollow } from '@/app/[locale]/(public)/profile/[username]/_actions/toggleFollow';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { UserCard } from '@/app/[locale]/_components/UserCard';

type FollowingUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type Props = {
  initialList: FollowingUser[];
  locale: string;
};

export function FollowingList({ initialList, locale }: Props) {
  const t = useTranslations('MypageFollowing');
  const [isPending, startTransition] = useTransition();
  const [optimisticList, removeFromList] = useOptimistic(
    initialList,
    (current, removedUsername: string) => current.filter((u) => u.username !== removedUsername)
  );
  const [confirmTarget, setConfirmTarget] = useState<FollowingUser | null>(null);

  const handleUnfollow = (user: FollowingUser) => {
    setConfirmTarget(user);
  };

  const handleConfirm = () => {
    if (!confirmTarget) return;

    const username = confirmTarget.username;
    setConfirmTarget(null);

    startTransition(async () => {
      removeFromList(username);
      await toggleFollow(username, locale);
    });
  };

  const handleCancel = () => {
    setConfirmTarget(null);
  };

  if (optimisticList.length === 0) {
    return <p className="text-muted-foreground">{t('empty')}</p>;
  }

  return (
    <>
      <div className="space-y-3">
        {optimisticList.map((user) => (
          <UserCard
            key={user.id}
            username={user.username}
            displayName={user.displayName}
            avatarUrl={user.avatarUrl}
            locale={locale}
            actions={
              <button
                type="button"
                onClick={() => handleUnfollow(user)}
                disabled={isPending}
                className="rounded-full border border-border px-5 py-1.5 text-sm font-semibold text-foreground transition-colors hover:border-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:border-red-700 dark:hover:bg-red-950 disabled:opacity-50 cursor-pointer"
              >
                {t('unfollow')}
              </button>
            }
          />
        ))}
      </div>

      <ConfirmationModal
        isOpen={confirmTarget !== null}
        title={t('unfollowConfirmTitle')}
        message={t('unfollowConfirmMessage', {
          name: confirmTarget?.displayName ?? confirmTarget?.username ?? '',
        })}
        confirmText={t('unfollow')}
        cancelText={t('cancel')}
        confirmVariant="danger"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
