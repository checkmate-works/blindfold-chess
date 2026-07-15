'use client';

import type {
  LikeToggleButtonHitArea,
  LikeToggleButtonSize,
} from '@/app/[locale]/_components/LikeToggleButton';
import { LikeToggleButton } from '@/app/[locale]/_components/LikeToggleButton';

import { toggleGameCommentLikeAction } from '../_actions/game-comments';

type Props = {
  commentId: string;
  locale: string;
  initialLikeCount: number;
  initialLikedByMe: boolean;
  size?: LikeToggleButtonSize;
  hitArea?: LikeToggleButtonHitArea;
};

/**
 * Heart toggle on a game comment — binds the game-comment like action
 * (no topicKey) to the shared `LikeToggleButton` (optimistic update +
 * guest auth prompt).
 */
export function GameCommentLikeButton({
  commentId,
  locale,
  initialLikeCount,
  initialLikedByMe,
  size,
  hitArea,
}: Props) {
  return (
    <LikeToggleButton
      initialLikeCount={initialLikeCount}
      initialLikedByMe={initialLikedByMe}
      onToggle={() => toggleGameCommentLikeAction(commentId, locale)}
      i18nNamespace="sharedGames.comments"
      size={size}
      hitArea={hitArea}
    />
  );
}
