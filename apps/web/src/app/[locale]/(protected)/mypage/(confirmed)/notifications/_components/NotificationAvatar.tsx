import Image from 'next/image';

import type { IconType } from 'react-icons';
import { GiBlackBelt } from 'react-icons/gi';
import { HiGift, HiMegaphone, HiSparkles, HiTrophy } from 'react-icons/hi2';

import type { NotificationWithActor } from '../_lib/queries';

type Props = {
  notification: NotificationWithActor;
  actorName: string;
};

const ICON_WRAPPER_CLASS =
  'flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground flex-shrink-0';

/** System notification types that render a fixed icon instead of an actor avatar. */
const SYSTEM_ICONS: Record<string, IconType> = {
  achievement_granted: HiTrophy,
  benefit_grant: HiGift,
  point_grant: HiGift,
  like_coin_grant: HiGift,
  rank_grant: GiBlackBelt,
  announcement: HiMegaphone,
  ai_review_ready: HiSparkles,
  ai_review_failed: HiSparkles,
};

/**
 * Leading avatar / icon for a notification row. System notifications
 * (achievement / benefit / coin / announcement) render a fixed icon; actor
 * notifications render the actor's avatar or initials.
 */
export function NotificationAvatar({ notification, actorName }: Props) {
  const actor = notification.actor;

  const SystemIcon = SYSTEM_ICONS[notification.type];
  if (SystemIcon) {
    return (
      <div className={ICON_WRAPPER_CLASS}>
        <SystemIcon className="h-5 w-5" />
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
