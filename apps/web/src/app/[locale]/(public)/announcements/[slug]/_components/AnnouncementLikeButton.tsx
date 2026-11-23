'use client';

import { LikeToggleButton } from '@/app/[locale]/_components/LikeToggleButton';

import { toggleAnnouncementLikeAction } from '../_actions/toggleAnnouncementLike';

type Props = {
  slug: string;
  locale: string;
  initialLikeCount: number;
  initialLikedByMe: boolean;
};

/** Heart toggle under an announcement body. Guests get the sign-in prompt. */
export function AnnouncementLikeButton({
  slug,
  locale,
  initialLikeCount,
  initialLikedByMe,
}: Props) {
  return (
    <LikeToggleButton
      initialLikeCount={initialLikeCount}
      initialLikedByMe={initialLikedByMe}
      onToggle={() => toggleAnnouncementLikeAction(slug, locale)}
      i18nNamespace="announcementLike"
    />
  );
}
