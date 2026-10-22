import type { IconType } from 'react-icons';
import { GiBlackBelt } from 'react-icons/gi';
import { HiGift, HiMegaphone, HiSparkles, HiTrophy } from 'react-icons/hi2';

import { buildProfileHref } from '@/lib/users/author-profile';

import { UserAvatar } from '@/app/[locale]/_components/UserAvatar';

import type { NotificationWithActor } from '../_lib/queries';

type Props = {
  notification: NotificationWithActor;
  actorName: string;
  locale: string;
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
 * notifications render the actor's avatar or initials, linked to the
 * actor's profile like every other avatar on the site (feed cards, topic
 * posts). The row's own link points at the notification's target, so the
 * avatar is the one place the viewer can reach the person behind it.
 *
 * Rendered as a sibling of the row link, never inside it: an `<a>` cannot
 * nest another `<a>`, and the row is one. A deleted actor has no profile
 * to link to, so `buildProfileHref` returns `null` and the avatar renders
 * unlinked with a `?` placeholder.
 */
export function NotificationAvatar({ notification, actorName, locale }: Props) {
  const actor = notification.actor;

  const SystemIcon = SYSTEM_ICONS[notification.type];
  if (SystemIcon) {
    return (
      <div className={ICON_WRAPPER_CLASS}>
        <SystemIcon className="h-5 w-5" />
      </div>
    );
  }

  return (
    <UserAvatar
      profileHref={buildProfileHref(actor)}
      avatarUrl={actor?.avatarUrl}
      displayName={actorName || '?'}
      locale={locale}
      size="md"
      showName={false}
    />
  );
}
