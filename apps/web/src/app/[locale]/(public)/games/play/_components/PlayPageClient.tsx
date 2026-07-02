'use client';

import type { ReactNode } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { ExpInfo } from '@blindfold-chess/features/exp';

import type { BoardVisibility } from '@/lib/games/board-visibility';
import type { MoveInputPreferenceHint } from '@/lib/games/move-input-cookie';

import { Divider } from '@/app/[locale]/_components/Divider';
import { PagePanel } from '@/app/[locale]/_components/PagePanel';
import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useGameSession } from '../_hooks';
import { PlayClient } from './PlayClient';
import { PlayHelpTour } from './PlayHelpTour';

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
  /**
   * Server-resolved global `boardVisibility` from the `bfc_board_visibility_pref`
   * cookie. Lets the pre-hydration board skeleton reserve the compact bar for
   * 'never' (pure blindfold) instead of a full-size board, avoiding a ~500px
   * collapse on hydration.
   */
  initialBoardVisibility: BoardVisibility;
  /**
   * Whether the viewer is signed in (resolved server-side). Gates the
   * finished-game Exp display — guests never see it.
   */
  isAuthenticated: boolean;
  /**
   * Already-granted AI-game Exp for this game, resolved server-side from
   * `?gameId`. Shown in the finished-game review under the result overlay.
   * Null for guests, in-progress games, or games not yet granted.
   */
  expInfo: ExpInfo | null;
};

export function PlayPageClient({
  locale,
  breadcrumb,
  initialMoveInputHint,
  initialBoardVisibility,
  isAuthenticated,
  expInfo,
}: Props) {
  const t = useTranslations('play');

  // Own the game session here so the page-level status slot (PageTitle) can
  // read move-error / AI-thinking / AI-move-announcement state directly,
  // without a useEffect bridge from PlayClient.
  const gameSession = useGameSession({ locale });
  const { error: moveError, lastAttemptedInput } = gameSession.moveInput;
  const { isLoadingFromStorage } = gameSession.gameState;
  const { preferences: globalPreferences, isHydrated } = useGamePreferences();

  // Matches the `isInitializing` predicate in `PlayClient` so the title and
  // the input panel both transition out of their "loading" state in lockstep.
  const isInitializing = isLoadingFromStorage || !isHydrated;

  // Which on-page controls the help tour can point at. Mirrors the gates that
  // decide whether each control renders: the settings gear needs a per-game
  // snapshot to edit; the input-mode switch only appears with ≥2 enabled modes.
  const hasSettingsGear = gameSession.gameConfig.initialPerGamePrefs !== undefined;
  const hasInputModeSwitch = globalPreferences.enabledMoveInputModes.length >= 2;

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
    <div className="space-y-8">
      {/* A left spacer balances the right-hand help-tour slot so the title stays
          truly centered, and the help slot keeps a constant width whether or not
          the "?" button renders (its presence depends on post-hydration state).
          Both keep the title row from shifting; loading.tsx mirrors this. */}
      <div className="flex items-center justify-center gap-2">
        <div className="w-6 shrink-0" aria-hidden />
        {/* min-w-0 lets the h1 flex item shrink so the inner `truncate` still
            clips a long move-error string instead of overflowing the row. */}
        <PageTitle className="min-w-0">{titleContent}</PageTitle>
        <div className="flex w-6 shrink-0 justify-center">
          <PlayHelpTour
            locale={locale}
            hasSettingsGear={hasSettingsGear}
            hasInputModeSwitch={hasInputModeSwitch}
          />
        </div>
      </div>
      <PagePanel>
        <PlayClient
          locale={locale}
          gameSession={gameSession}
          initialMoveInputHint={initialMoveInputHint}
          initialBoardVisibility={initialBoardVisibility}
          isInitializing={isInitializing}
          isAuthenticated={isAuthenticated}
          expInfo={expInfo}
        />
        {/* Mirror `PageLayout`'s trailing block — see PageLayout.tsx. */}
        <div className="!mt-4 space-y-4">
          <Divider />
          {breadcrumb}
        </div>
      </PagePanel>
    </div>
  );
}
