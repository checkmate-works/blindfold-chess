'use client';

import { useEffect, useRef, useState } from 'react';

import type { UsePersistentSettingsReturn } from '@blindfold-chess/features/common/client';

/**
 * Let a link pick the settings a challenge setup screen opens with, on top of
 * the persisted settings that screen otherwise reads.
 *
 * The setup screens keep their settings in storage rather than the URL, so
 * that hops which rebuild a bare URL (quitting a session, the tutorial's
 * closing button) do not silently reset them. But a leaderboard's "Try This
 * Challenge" button names one specific setting — the bishop board, the black
 * orientation — and storage still holds whatever the player last chose, so
 * reading storage alone opened the knight setup under a bishop leaderboard.
 *
 * `seed` is the link's choice, already validated by the caller (`undefined`
 * when the link named nothing usable). Once storage has loaded it is written
 * through `updateSettings`, so it becomes the player's latest choice and
 * survives the same hops any other choice does; writing it earlier would be
 * overwritten by the stored value arriving afterwards. Until then the seed is
 * overlaid on the returned settings so the screen never shows the stale one.
 *
 * After the write, `consumedParams` are stripped from the URL. Left in place,
 * a reload or a return through history would re-apply the seed over whatever
 * the player had changed since. `history.replaceState` is the App Router's
 * shallow update — no RSC re-fetch, no history entry. Its state argument must
 * be `null`: the router's patch treats a state carrying its own internal
 * marker as one of its own calls and leaves `useSearchParams` reporting the
 * stale URL.
 */
export function useQuerySeededSettings<T extends Record<string, unknown>>(
  persistent: UsePersistentSettingsReturn<T>,
  seed: Partial<T> | undefined,
  consumedParams: readonly string[]
): UsePersistentSettingsReturn<T> {
  const { settings, updateSettings, isLoaded } = persistent;

  // Captured once: the seed describes how the screen was entered, so a later
  // change in the caller's props must not re-apply it.
  const seedRef = useRef(seed);
  const consumedParamsRef = useRef(consumedParams);
  const [isPending, setIsPending] = useState(seed !== undefined);

  useEffect(() => {
    const pendingSeed = seedRef.current;
    if (!isLoaded || !isPending || pendingSeed === undefined) return;

    updateSettings(pendingSeed);
    setIsPending(false);

    const url = new URL(window.location.href);
    for (const param of consumedParamsRef.current) url.searchParams.delete(param);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }, [isLoaded, isPending, updateSettings]);

  return {
    ...persistent,
    settings: isPending && seedRef.current ? { ...settings, ...seedRef.current } : settings,
  };
}
