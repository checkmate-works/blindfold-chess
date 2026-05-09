'use client';

import { useEffect, useRef, useState } from 'react';

import type { PuzzleDraftV1 } from '../_lib/draft-storage';
import { readDraft } from '../_lib/draft-storage';

type Options = {
  /**
   * Apply a recovered draft payload onto the form state. Called at most
   * once, only when `readDraft()` returns a non-null payload. The callback
   * is mirrored into a ref so the consumer can pass an inline closure each
   * render without re-firing the hydration effect.
   */
  apply: (draft: PuzzleDraftV1) => void;
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
export function usePuzzleDraftHydration({ apply }: Options): Return {
  const didHydrate = useRef(false);
  const [hydratedFromDraft, setHydratedFromDraft] = useState(false);

  // Mirror callback into a ref so the once-on-mount effect can call the
  // latest closure without listing `apply` in deps and re-firing every
  // render.
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(() => {
    if (didHydrate.current) return;
    didHydrate.current = true;
    const draft = readDraft();
    if (!draft) return;
    applyRef.current(draft);
    setHydratedFromDraft(true);
  }, []);

  return {
    hydratedFromDraft,
    resetHydrated: () => setHydratedFromDraft(false),
  };
}
