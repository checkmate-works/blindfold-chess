'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaEyeSlash } from 'react-icons/fa';

type Props = {
  onReveal: () => void;
};

/**
 * Tap-to-reveal overlay covering a spoiler-flagged comment body. Absolutely
 * positioned over the (aria-hidden) text; revealing removes it.
 */
export function CommentSpoilerOverlay({ onReveal }: Props) {
  const tTopics = useTranslations('topics');

  return (
    <button
      type="button"
      onClick={onReveal}
      aria-label={tTopics('spoiler.overlayAriaLabel')}
      className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-sm bg-muted text-muted-foreground hover:bg-muted/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
    >
      <span className="flex items-center gap-1.5 text-sm font-medium">
        <FaEyeSlash aria-hidden="true" />
        {tTopics('spoiler.overlayTitle')}
      </span>
      <span className="text-xs text-muted-foreground/80">{tTopics('spoiler.overlayHint')}</span>
    </button>
  );
}
