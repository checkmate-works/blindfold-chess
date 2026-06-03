import Image from 'next/image';

import { HiGift, HiMegaphone, HiTrophy } from 'react-icons/hi2';

import type { NotificationWithActor } from '../_lib/queries';

type Props = {
  notification: NotificationWithActor;
  actorName: string;
};

const ICON_WRAPPER_CLASS =
  'flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground flex-shrink-0';

/**
 * Leading avatar / icon for a notification row. System notifications
 * (achievement / benefit / coin / announcement) render a fixed icon; actor
 * notifications render the actor's avatar or initials.
 */
export function NotificationAvatar({ notification, actorName }: Props) {
  const actor = notification.actor;

  if (notification.type === 'achievement_granted') {
    return (
      <div className={ICON_WRAPPER_CLASS}>
        <HiTrophy className="h-5 w-5" />
      </div>
    );
  }

  if (
    notification.type === 'benefit_grant' ||
    notification.type === 'point_grant' ||
    notification.type === 'like_coin_grant'
  ) {
    return (
      <div className={ICON_WRAPPER_CLASS}>
        <HiGift className="h-5 w-5" />
      </div>
    );
  }

  if (notification.type === 'announcement') {
    return (
      <div className={ICON_WRAPPER_CLASS}>
        <HiMegaphone className="h-5 w-5" />
      </div>
    );
  }

  if (actor?.avatarUrl) {
    return (
      <Image
        src={actor.avatarUrl}
        alt={actorName}
        width={40}
        height={40}
        className="rounded-full object-cover h-10 w-10 flex-shrink-0"
        // Pre-resized 256×256 WebP at upload; bypass Vercel optimization.
        unoptimized
      />
    );
  }

  return (
    <div className={ICON_WRAPPER_CLASS}>
      <span className="text-sm font-medium">
        {actorName ? actorName.charAt(0).toUpperCase() : '?'}
      </span>
    </div>
  );
}
