'use client';

import { useMemo } from 'react';

import type { MoveInputPreferenceHint } from '@/lib/games/move-input-cookie';
import type { PeekPreferenceHint } from '@/lib/games/peek-cookie';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type {
  GamePreferences,
  PerGamePreferences,
} from '@/app/[locale]/_contexts/GamePreferencesContext';

import {
  deriveMoveInputSkeletonProps,
  shouldShowInlinePeekHeader,
  shouldShowModalPeekButton,
} from '../_lib';

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
 *  - The pre-hydration "skeleton" derivations: which input-mode shape to
 *    reserve, whether to reserve the inline-peek header strip, and
 *    whether to reserve the modal-peek action button. Each prefers the
 *    cookie hint while `isHydrated === false`, then flips to the merged
 *    `preferences` once localStorage has been read.
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
  initialPeekHint,
}: {
  perGamePrefs: PerGamePreferences | undefined;
  initialMoveInputHint: MoveInputPreferenceHint;
  initialPeekHint: PeekPreferenceHint;
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
      showOwnPieces: perGamePrefs.showOwnPieces,
      showOpponentPieces: perGamePrefs.showOpponentPieces,
      pieceShapeMode: perGamePrefs.pieceShapeMode,
      pieceColors: perGamePrefs.pieceColors,
      // peekMode was added to PerGamePreferences after the field set settled,
      // so legacy `gamePreferences` records on disk may not carry it.
      // Falling back to the global value keeps those records rendering as
      // they always did, and a subsequent mid-game edit + save will backfill
      // the per-game record forward-compat.
      peekMode: perGamePrefs.peekMode ?? globalPreferences.peekMode,
      // moveInputMode was promoted to per-game later still — same fallback
      // pattern. Legacy records simply track the global until the user
      // toggles in this game, at which point per-game takes over.
      moveInputMode: perGamePrefs.moveInputMode ?? globalPreferences.moveInputMode,
    };
  }, [globalPreferences, perGamePrefs]);

  // Pre-hydration peek skeleton decisions: cookie hint wins on first paint,
  // `preferences` (merged with per-game overrides) wins post-hydration.
  const skeletonShowInlinePeekHeader = isHydrated
    ? shouldShowInlinePeekHeader(preferences)
    : shouldShowInlinePeekHeader(initialPeekHint);
  const skeletonShowModalPeekButton = isHydrated
    ? shouldShowModalPeekButton(preferences)
    : shouldShowModalPeekButton(initialPeekHint);

  return {
    preferences,
    globalPreferences,
    updatePreferences,
    skeletonMode,
    skeletonHasModeSwitch,
    skeletonShowInlinePeekHeader,
    skeletonShowModalPeekButton,
  };
}
