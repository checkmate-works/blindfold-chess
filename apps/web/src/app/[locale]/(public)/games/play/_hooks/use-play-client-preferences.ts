'use client';

import { useMemo } from 'react';

import type { MoveInputPreferenceHint } from '@/lib/games/move-input-cookie';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type {
  GamePreferences,
  PerGamePreferences,
} from '@/app/[locale]/_contexts/GamePreferencesContext';

import { deriveMoveInputSkeletonProps } from '../_lib';

/**
 * The `play` page has two interlocking preference layers: a *global*
 * preference set (read from localStorage via `GamePreferencesContext`)
 * and a *per-game* override snapshot (saved with the game record). The
 * rendered surface needs the merged "effective right now" view, plus a
 * pre-hydration view derived from server-side cookie hints so the SSR
 * paint matches the first hydrated paint.
 *
 * This hook consolidates the three derivations PlayClient used to inline:
 *
 *  - The merged `preferences` (per-game overrides over global).
 *  - The pre-hydration move-input "skeleton" derivation: which input-mode
 *    shape to reserve. Prefers the cookie hint while `isHydrated === false`,
 *    then flips to the merged `preferences` once localStorage has been read.
 *    (The board skeleton no longer needs a peek hint — the board is always
 *    rendered at a fixed size, with the blindfold expressed as a mask overlay.)
 *  - The `globalPreferences` + `updatePreferences` passthrough so the
 *    page doesn't have to call `useGamePreferences()` *and* this hook.
 *
 * Why extracted: the merge has six fallback rules (boardVisibility,
 * highlightLastMove, showOwnPieces, showOpponentPieces, pieceShapeMode,
 * pieceColors plus the two later-added fields peekMode + moveInputMode).
 * Two of those fallbacks exist because the field was added to
 * PerGamePreferences after the schema settled, so legacy game records
 * may not carry them — those nuances belong with the merge, not with the
 * JSX. Pulling the merge out also gives the pre-hydration / hydrated
 * cookie reconciliation a self-documenting home.
 */
export function usePlayClientPreferences({
  perGamePrefs,
  initialMoveInputHint,
}: {
  perGamePrefs: PerGamePreferences | undefined;
  initialMoveInputHint: MoveInputPreferenceHint;
}) {
  const { preferences: globalPreferences, updatePreferences, isHydrated } = useGamePreferences();

  // Pre-hydration skeleton shape: prefer the cookie-sourced hints from the
  // server over `globalPreferences` (which is still the provider's defaults
  // until localStorage is read). Once `isHydrated` flips true,
  // `globalPreferences` becomes the source of truth — matching the
  // localStorage value, which may or may not agree with the cookie.
  //
  // Reconciliation rule: cookie wins on first paint (driven by these
  // branches); localStorage wins post-hydration (driven by
  // `globalPreferences`). The `GamePreferencesContext` also mirrors
  // subsequent preference changes back to the cookie so the two stay in
  // sync on the next navigation.
  //
  // Pre-hydration derivation is shared with `loading.tsx` via
  // `deriveMoveInputSkeletonProps` so the two entry points stay in lockstep.
  const hintSkeletonProps = deriveMoveInputSkeletonProps(initialMoveInputHint);
  const skeletonMode = isHydrated ? globalPreferences.moveInputMode : hintSkeletonProps.mode;
  const skeletonHasModeSwitch = isHydrated
    ? globalPreferences.enabledMoveInputModes.length >= 2
    : hintSkeletonProps.hasModeSwitch;

  // Merge per-game preferences with global preferences. Per-game fields
  // override global; remaining fields come from global.
  const preferences: GamePreferences = useMemo(() => {
    if (!perGamePrefs) return globalPreferences;
    return {
      ...globalPreferences,
      boardVisibility: perGamePrefs.boardVisibility ?? globalPreferences.boardVisibility,
      highlightLastMove: perGamePrefs.highlightLastMove,
      // showPieceDestinations entered PerGamePreferences after the field set
      // settled, so legacy `gamePreferences` records may not carry it; fall
      // back to the global until the user toggles it in this game.
      showPieceDestinations:
        perGamePrefs.showPieceDestinations ?? globalPreferences.showPieceDestinations,
      showOwnPieces: perGamePrefs.showOwnPieces,
      showOpponentPieces: perGamePrefs.showOpponentPieces,
      pieceShapeMode: perGamePrefs.pieceShapeMode,
      pieceColors: perGamePrefs.pieceColors,
      // pawnHideMode entered PerGamePreferences after the field set settled, so
      // legacy `gamePreferences` records may not carry it; fall back to the
      // global until the user toggles it in this game.
      pawnHideMode: perGamePrefs.pawnHideMode ?? globalPreferences.pawnHideMode,
      // moveInputMode was promoted to per-game after the field set settled, so
      // legacy `gamePreferences` records may not carry it; fall back to the
      // global until the user toggles in this game.
      moveInputMode: perGamePrefs.moveInputMode ?? globalPreferences.moveInputMode,
      // aiReplyDuration entered PerGamePreferences after the field set settled,
      // so legacy records may not carry it; fall back to the global default.
      aiReplyDuration: perGamePrefs.aiReplyDuration ?? globalPreferences.aiReplyDuration,
    };
  }, [globalPreferences, perGamePrefs]);

  return {
    preferences,
    globalPreferences,
    updatePreferences,
    skeletonMode,
    skeletonHasModeSwitch,
  };
}
