'use client';

import type { ReactNode } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { MoveInputPreferenceHint } from '@/lib/games/move-input-cookie';

import { Divider } from '@/app/[locale]/_components/Divider';
import { PagePanel } from '@/app/[locale]/_components/PagePanel';
import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useGameSession } from '../_hooks';
import { shouldShowAiPulse } from '../_lib';
import { AiMovePulse } from './AiMovePulse';
import { PlayClient } from './PlayClient';

type Props = {
  locale: Locale;
  breadcrumb: ReactNode;
  /**
   * Server-resolved move-input mode hint from the `bfc_move_input_pref`
   * cookie. Used by `PlayClient` to pick the correct `MoveInputSkeleton`
   * shape during SSR + pre-hydration, eliminating the ~288 px → 50/56 px
   * CLS that returning `text` / `select` users otherwise saw on first paint.
   */
  initialMoveInputHint: MoveInputPreferenceHint;
};

export function PlayPageClient({ locale, breadcrumb, initialMoveInputHint }: Props) {
  const t = useTranslations('play');

  // Own the game session here so the page-level status slot (PageTitle) can
  // read move-error / AI-thinking / AI-move-announcement state directly,
  // without a useEffect bridge from PlayClient.
  const gameSession = useGameSession({ locale });
  const { aiMoveSignal } = gameSession;
  const { error: moveError, lastAttemptedInput } = gameSession.moveInput;
  const { isLoadingFromStorage } = gameSession.gameState;
  const { preferences: globalPreferences, isHydrated } = useGamePreferences();

  // Resolve the effective board visibility (per-game falls back to global) and
  // delegate the pulse-vs-no-pulse policy to `shouldShowAiPulse` (fires in the
  // blindfold modes, suppressed when the board is always visible).
  const perGamePrefs = gameSession.gameConfig.perGamePrefs;
  const aiPulseEnabled = shouldShowAiPulse({
    boardVisibility: perGamePrefs?.boardVisibility ?? globalPreferences.boardVisibility,
  });
  // Matches the `isInitializing` predicate in `PlayClient` so the title and
  // the input panel both transition out of their "loading" state in lockstep.
  const isInitializing = isLoadingFromStorage || !isHydrated;

  // Resolve the content of the page-title slot.
  // Priority: active move error → initial-load "Loading..." → "Play Chess"
  // title. The AI-thinking state and the AI's last-move announcement now live
  // on the board itself (AiReplyChip), visible without scrolling up, so they
  // are intentionally NOT mirrored here. The span stays `truncate block` so an
  // error string never wraps to 2 lines / causes CLS on narrow viewports.
  const titleContent = (
    <span
      className={`truncate block ${
        moveError ? 'text-destructive' : isInitializing ? 'text-muted-foreground' : ''
      }`}
    >
      {moveError
        ? lastAttemptedInput
          ? `\u26A0 ${t('invalidMove')}: ${lastAttemptedInput}`
          : `\u26A0 ${moveError}`
        : isInitializing
          ? t('loading')
          : t('title')}
    </span>
  );

  return (
    <>
      {/* Fixed / out-of-flow — kept outside `space-y-8` so it adds no margin. */}
      <AiMovePulse signal={aiMoveSignal} enabled={aiPulseEnabled} />
      <div className="space-y-8">
        <PageTitle>{titleContent}</PageTitle>
        <PagePanel>
          <PlayClient
            locale={locale}
            gameSession={gameSession}
            initialMoveInputHint={initialMoveInputHint}
            isInitializing={isInitializing}
          />
          {/* Mirror `PageLayout`'s trailing block — see PageLayout.tsx. */}
          <div className="!mt-4 space-y-4">
            <Divider />
            {breadcrumb}
          </div>
        </PagePanel>
      </div>
    </>
  );
}
