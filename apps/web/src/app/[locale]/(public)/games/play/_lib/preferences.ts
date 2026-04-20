import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

/**
 * Returns true when the "Show Board" action row button should be reserved/rendered.
 * This mirrors the Show Board button's rendering condition in GameInProgressPanel
 * and is reused by the initializing skeleton so both stay in sync.
 */
export function shouldShowModalPeekButton(preferences: GamePreferences): boolean {
  return preferences.showBoardButtonInGame && preferences.peekMode === 'modal';
}

/**
 * Returns true when the inline peek board (with its ~46px header) should be
 * reserved/rendered. This mirrors the InlineBoardView rendering condition in
 * PlayClient and is reused by the initializing skeleton (InlineBoardHeaderSkeleton)
 * so both stay in sync.
 */
export function shouldShowInlinePeekHeader(preferences: GamePreferences): boolean {
  return preferences.showBoardButtonInGame && preferences.peekMode === 'inline';
}
