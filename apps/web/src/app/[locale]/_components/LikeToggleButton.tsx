'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai';

import type { ToggleLikeResult } from '../_hooks/use-like-toggle';
import { useLikeToggle } from '../_hooks/use-like-toggle';
import { AuthPromptModal } from './AuthPromptModal';
import { EngagementCounter, engagementIconClass } from './EngagementCounter';
import type { EngagementCounterHitArea, EngagementCounterSize } from './EngagementCounter';

export type { ToggleLikeResult };

export type LikeToggleButtonSize = EngagementCounterSize;

export type LikeToggleButtonHitArea = EngagementCounterHitArea;

type Props = {
  initialLikeCount: number;
  initialLikedByMe: boolean;
  /** Bound like Server Action; the wrapper decides which endpoint this hits. */
  onToggle: () => Promise<ToggleLikeResult>;
  /** Namespace containing the `like` / `unlike` aria-label keys. */
  i18nNamespace: string;
  size?: LikeToggleButtonSize;
  hitArea?: LikeToggleButtonHitArea;
};

/**
 * Shared heart toggle used by every like surface (home timeline, topics,
 * game comments, puzzles, ...). Owns the optimistic-update flow and the
 * guest auth prompt; wrappers only bind the concrete Server Action.
 */
export function LikeToggleButton({
  initialLikeCount,
  initialLikedByMe,
  onToggle,
  i18nNamespace,
  size = 'md',
  hitArea = 'none',
}: Props) {
  const t = useTranslations(i18nNamespace);
  const { liked, count, isPending, toggle, isModalOpen, closeModal } = useLikeToggle({
    initialLikeCount,
    initialLikedByMe,
    onToggle,
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label={liked ? t('unlike') : t('like')}
        className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        <EngagementCounter
          icon={
            liked ? (
              <AiFillHeart className={`${engagementIconClass(size)} text-red-500`} />
            ) : (
              <AiOutlineHeart className={engagementIconClass(size)} />
            )
          }
          count={count}
          size={size}
          hitArea={hitArea}
        />
      </button>
      {isModalOpen && <AuthPromptModal isOpen={isModalOpen} onClose={closeModal} />}
    </>
  );
}
