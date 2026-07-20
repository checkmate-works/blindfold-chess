'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai';

import { AuthPromptModal } from '@/app/[locale]/_components/AuthPromptModal';
import type { ToggleLikeResult } from '@/app/[locale]/_hooks/use-like-toggle';
import { useLikeToggle } from '@/app/[locale]/_hooks/use-like-toggle';

type Props = {
  initialLikeCount: number;
  initialLikedByMe: boolean;
  onToggle: () => Promise<ToggleLikeResult>;
};

const BASE_CLASS =
  'flex w-full items-center justify-center gap-2 rounded-lg border px-6 py-3 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const UNLIKED_CLASS =
  'border-rose-200 bg-card text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/20';
const LIKED_CLASS =
  'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/30';

/**
 * Full-width like nudge on the puzzle result screen — a stronger ask than
 * the small heart icon on the detail page, placed right above the primary
 * action buttons where the user's attention already is right after solving.
 *
 * Visibility is locked to the like state at mount time, not the live
 * `initialLikedByMe` prop: once shown, tapping it flips between
 * liked/unliked like a normal toggle instead of vanishing the instant
 * it's pressed (that read as broken). Only a puzzle the viewer had
 * already liked before arriving stays hidden.
 *
 * `useState` rather than reading the prop directly matters here — clicking
 * the button invokes a Server Action, and Next.js auto-refreshes this
 * `dynamic = 'force-dynamic'` route's server-rendered data afterward, which
 * re-passes `initialLikedByMe` down as `true` on the next render. Reading
 * the prop live would re-trigger the hide on that refresh, reproducing the
 * exact "disappears right after I click it" bug this component exists to
 * avoid. `useState`'s initializer only runs once, on mount, so it stays
 * pinned to whatever the puzzle's like state was when the page first loaded.
 */
export function PuzzleResultLikeCta({ initialLikeCount, initialLikedByMe, onToggle }: Props) {
  const t = useTranslations('practice.puzzle.result');
  const [wasLikedOnLoad] = useState(initialLikedByMe);
  const { liked, isPending, toggle, isModalOpen, closeModal } = useLikeToggle({
    initialLikeCount,
    initialLikedByMe,
    onToggle,
  });

  if (wasLikedOnLoad) return null;

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-pressed={liked}
        className={`${BASE_CLASS} ${liked ? LIKED_CLASS : UNLIKED_CLASS}`}
      >
        {liked ? <AiFillHeart className="h-5 w-5" /> : <AiOutlineHeart className="h-5 w-5" />}
        {liked ? t('likedCta') : t('likeCta')}
      </button>
      {isModalOpen && <AuthPromptModal isOpen={isModalOpen} onClose={closeModal} />}
    </>
  );
}
