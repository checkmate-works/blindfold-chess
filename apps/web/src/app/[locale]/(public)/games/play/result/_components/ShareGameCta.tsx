'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaShareAlt } from 'react-icons/fa';

type Props = {
  /** Publish this game (or open it if already published from this browser). */
  onShare: () => void;
  /** Whether this game was already published from this browser. */
  isShared: boolean;
};

/**
 * The result screen's primary publish action. Publishing is open to everyone —
 * anonymous and provisional players included (see `publishGameAction`) — so this
 * is deliberately NOT behind an auth guard, unlike the members-only discussion
 * CTAs. It routes straight to the publish form (or the already-published game).
 * Shown above the Summary/Discussion tabs so it's a first-class action.
 */
export function ShareGameCta({ onShare, isShared }: Props) {
  const t = useTranslations('play');

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-5 text-center">
      <p className="text-sm text-muted-foreground">{t('result.sharePrompt')}</p>
      <button
        type="button"
        onClick={onShare}
        className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <FaShareAlt className="h-4 w-4" aria-hidden />
        {isShared ? t('result.viewShared') : t('result.publish')}
      </button>
    </div>
  );
}
