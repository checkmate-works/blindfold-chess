'use client';

import { useId } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaShareAlt } from 'react-icons/fa';

import { CloseButton } from '@/app/[locale]/_components/CloseButton';
import { Modal } from '@/app/[locale]/_components/Modal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Publish this game (or open it if already published from this browser). */
  onShare: () => void;
  /** Whether this game was already published from this browser. */
  isShared: boolean;
};

/**
 * Prompt to share a not-yet-published game before it can be discussed. The local
 * result screen has no server-side record to attach comments/chunks to, so
 * tapping a discussion compose CTA opens this instead of an inline composer.
 * Rendered as a modal that mirrors the sign-in prompt ({@link AuthPromptModal})
 * — same shell, title + description, and full-width primary action — so the two
 * "do X first" gates read as one consistent pattern rather than an inline card.
 */
export function ShareEnableModal({ isOpen, onClose, onShare, isShared }: Props) {
  const t = useTranslations('play');
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div className="relative space-y-4">
        <CloseButton
          onClick={onClose}
          size="w-5 h-5"
          className="absolute top-0 right-0 text-muted-foreground hover:text-foreground transition-colors"
        />
        <h2 id={titleId} className="text-xl font-bold text-foreground pr-8">
          {t('result.shareTitle')}
        </h2>
        <p id={descriptionId} className="text-muted-foreground">
          {t('result.sharePrompt')}
        </p>

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={onShare}
            className="flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-center font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <FaShareAlt className="h-4 w-4" aria-hidden />
            {isShared ? t('result.viewShared') : t('result.publish')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
