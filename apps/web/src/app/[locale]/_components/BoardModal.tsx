'use client';

import { type ReactNode, useEffect, useId, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { createPortal } from 'react-dom';

import { useScrollLock } from '../_hooks/use-scroll-lock';
import { CloseButton } from './CloseButton';

type Props = {
  /** Defaults to true for callers that mount the modal only while open. */
  isOpen?: boolean;
  /**
   * Always shown, always with the close button beside it. A board on its own
   * gives the reader no clue what they opened — whose game, which position,
   * quoted from where — and on a full-bleed phone layout there is no visible
   * card edge to tap "outside" of either, so the header is also the only
   * obvious way out.
   */
  title: string;
  onClose: () => void;
  /** Literal Tailwind class (`max-w-lg`); Tailwind's JIT cannot see a computed one. */
  maxWidth?: string;
  children: ReactNode;
};

/**
 * Shell for every modal whose body is a chess board: the quick-peek board in
 * games/play, a comment's quoted move reference, and an attached game or
 * position on a post.
 *
 * @design Full-bleed on mobile
 *
 * The board is the content, and a board rendered into a padded card wastes
 * the ~15% of a phone's width that decides whether a rank of pieces is
 * legible. So below `sm` the dialog spans the viewport with square corners
 * (the same treatment `InlineBoardView` gives the inline board); from `sm`
 * up it becomes the familiar bounded, rounded card.
 *
 * @design Why not the generic `Modal`
 *
 * `Modal` pads its content (`p-6`) and rounds it at every breakpoint, which
 * is exactly what a board must not have. Rather than thread a "no padding,
 * no radius, full width" flag through the generic component and its dozens
 * of unrelated callers, board surfaces share this peer, which owns the
 * board-specific chrome decisions in one place.
 */
export function BoardModal({
  isOpen = true,
  title,
  onClose,
  maxWidth = 'max-w-lg',
  children,
}: Props) {
  const t = useTranslations('Common');
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useScrollLock(isOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div onClick={(e) => e.stopPropagation()}>
      <div className="fixed inset-0 z-40 bg-black/70" aria-hidden="true" />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-0 sm:px-4"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full ${maxWidth} max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto bg-card rounded-none sm:rounded-md`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border py-1 pl-4 pr-1">
            <h2 id={titleId} className="truncate text-sm font-semibold text-foreground">
              {title}
            </h2>
            <CloseButton
              onClick={onClose}
              size="w-5 h-5"
              ariaLabel={t('close')}
              className="shrink-0 flex h-11 w-11 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:bg-muted sm:h-9 sm:w-9"
            />
          </div>

          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
