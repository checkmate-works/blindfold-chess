'use client';

import { useTranslations } from 'next-intl';

import { AiOutlineHeart } from 'react-icons/ai';

import { AuthPromptModal } from '@/app/[locale]/_components/AuthPromptModal';
import type { ToggleLikeResult } from '@/app/[locale]/_hooks/use-like-toggle';
import { useLikeToggle } from '@/app/[locale]/_hooks/use-like-toggle';

type Props = {
  initialLikeCount: number;
  initialLikedByMe: boolean;
  onToggle: () => Promise<ToggleLikeResult>;
};

/**
 * Full-width like nudge on the puzzle result screen — a stronger ask than
 * the small heart icon on the detail page, placed right above the primary
 * action buttons where the user's attention already is right after solving.
 * Hides itself once the puzzle is liked (including the moment the user taps
 * it), since a CTA to like something already liked reads as broken.
 */
export function PuzzleResultLikeCta({ initialLikeCount, initialLikedByMe, onToggle }: Props) {
  const t = useTranslations('practice.puzzle.result');
  const { liked, isPending, toggle, isModalOpen, closeModal } = useLikeToggle({
    initialLikeCount,
    initialLikedByMe,
    onToggle,
  });

  if (liked) return null;

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-background px-6 py-3 text-base font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/20"
      >
        <AiOutlineHeart className="h-5 w-5" />
        {t('likeCta')}
      </button>
      {isModalOpen && <AuthPromptModal isOpen={isModalOpen} onClose={closeModal} />}
    </>
  );
}
