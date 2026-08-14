'use client';

import { useCallback } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { TerminationMark } from '@/lib/games/termination-mark';

/**
 * Accessible name for a board's end-of-game badge ("Checkmate" / "Resignation").
 *
 * `ChessBoard` takes the label as a plain string — it is reused by
 * locale-agnostic surfaces (thumbnails, previews) that have no translator in
 * scope — so every surface that DOES show a finished game would otherwise
 * re-derive the same key. Shared here so the play board and the replay name the
 * mark identically.
 */
export function useTerminationMarkLabel(): (mark: TerminationMark | null) => string {
  // `Common.termination`, not `play.finishedGame.termination`: finished-game
  // badges appear on feed cards and profile timelines far outside the play
  // surface, and this hook was what pulled the whole `play` dictionary into
  // every one of those pages. The labels live in Common instead.
  const t = useTranslations('Common');

  return useCallback(
    (mark: TerminationMark | null) => (mark ? t(`termination.${mark.kind}`) : ''),
    [t]
  );
}
