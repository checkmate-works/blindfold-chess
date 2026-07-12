'use client';

import { useEffect, useRef, useState } from 'react';

import type { PuzzleDraftV1 } from '../_lib/draft-storage';
import { readDraft } from '../_lib/draft-storage';

type Options<T> = {
  /**
   * Read the draft payload to hydrate from. Defaults to the create-flow's
   * `readDraft` (single sessionStorage slot); the edit flow passes
   * `() => readEditDraft(positionId)` (an ID-scoped slot) instead.
   */
  read?: () => T | null;
  /**
   * Apply a recovered draft payload onto the form state. Called at most
   * once, only when `read()` returns a non-null payload. The callback
   * is mirrored into a ref so the consumer can pass an inline closure each
   * render without re-firing the hydration effect.
   */
  apply: (draft: T) => void;
  /**
   * Skip the hydration effect entirely. Used when the form is seeded from
   * a fork source (`?from=<id>`): the source payload owns the initial form
   * state, and silently overwriting it with an unrelated leftover draft
   * would confuse the user mid-fork.
   */
  enabled?: boolean;
};

type Return = {
  /**
   * `true` when an existing draft was found in sessionStorage on mount and
   * applied to the form. Drives the "Draft restored" banner; consumers must
   * call `resetHydrated` after an explicit "Start over" so the banner does
   * not linger past the manual reset.
   */
  hydratedFromDraft: boolean;
  resetHydrated: () => void;
};

/**
 * Run the once-on-mount draft-hydration handshake.
 *
 * `didHydrate` guards against remounts (e.g. Fast Refresh during dev)
 * clobbering user edits mid-authoring. The draft is intentionally NOT
 * cleared here — it survives `/new ↔ /new/preview` round-trips and is only
 * cleared by explicit "Start over", successful create, or `readDraft`
 * rejecting the blob as corrupt.
 */
export function usePuzzleDraftHydration<T = PuzzleDraftV1>({
  read = readDraft as unknown as () => T | null,
  apply,
  enabled = true,
}: Options<T>): Return {
  const didHydrate = useRef(false);
  const [hydratedFromDraft, setHydratedFromDraft] = useState(false);

  // Mirror callbacks into refs so the once-on-mount effect can call the
  // latest closures without listing them in deps and re-firing every render.
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const readRef = useRef(read);
  readRef.current = read;

  useEffect(() => {
    if (!enabled) return;
    if (didHydrate.current) return;
    didHydrate.current = true;
    const draft = readRef.current();
    if (!draft) return;
    applyRef.current(draft);
    setHydratedFromDraft(true);
  }, [enabled]);

  return {
    hydratedFromDraft,
    resetHydrated: () => setHydratedFromDraft(false),
  };
}
