'use client';

import type {
  LikeToggleButtonHitArea,
  LikeToggleButtonSize,
} from '@/app/[locale]/_components/LikeToggleButton';
import { LikeToggleButton } from '@/app/[locale]/_components/LikeToggleButton';

import type { ToggleLikeAction } from '../_lib/action-types';

type Props = {
  postId: string;
  locale: string;
  topicKey: string;
  initialLikeCount: number;
  initialLikedByMe: boolean;
  toggleLikeAction: ToggleLikeAction;
  i18nNamespace: string;
  size?: LikeToggleButtonSize;
  hitArea?: LikeToggleButtonHitArea;
};

/**
 * Heart toggle on a topic post — binds the page-provided topic like action
 * to the shared `LikeToggleButton` (optimistic update + guest auth prompt).
 */
export function LikeButton({
  postId,
  locale,
  topicKey,
  initialLikeCount,
  initialLikedByMe,
  toggleLikeAction,
  i18nNamespace,
  size,
  hitArea,
}: Props) {
  return (
    <LikeToggleButton
      initialLikeCount={initialLikeCount}
      initialLikedByMe={initialLikedByMe}
      onToggle={() => toggleLikeAction(postId, locale, topicKey)}
      i18nNamespace={i18nNamespace}
      size={size}
      hitArea={hitArea}
    />
  );
}
