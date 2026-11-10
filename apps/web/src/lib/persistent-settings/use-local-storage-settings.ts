'use client';

import { useMemo } from 'react';

import { type FieldGuard, pickValidFields } from '@blindfold-chess/features/common';
import { usePersistentSettings } from '@blindfold-chess/features/common/client';
import type { UsePersistentSettingsReturn } from '@blindfold-chess/features/common/client';

import { localStorageAdapter } from './local-storage-adapter';

/**
 * Web-local wrapper that injects the SSR-safe `localStorageAdapter` into the
 * shared `usePersistentSettings` hook, keeping the `(storageKey, defaults)`
 * call signature; mobile's counterpart is `useAsyncStorageSettings`.
 *
 * `guards` names a check for every field, and is required so a new module
 * cannot forget it: a stored value is whatever an older build wrote, and a
 * field that fails its check loads as the default instead of reaching a
 * component that cannot render it (see `pickValidFields`). Nothing is
 * rewritten on load, so the key and its JSON shape are unchanged and the
 * repaired value is only stored with the player's next change.
 *
 * This is the store for PER-MODULE practice settings (time limit, piece,
 * orientation: `coordinateQuiz_settings` and friends). The GLOBAL board
 * preferences (`showCoordinates`, piece set, board visibility) are a
 * different mechanism — `GamePreferencesContext` in
 * `app/[locale]/_contexts/`, which hand-rolls localStorage plus a cookie
 * hint for SSR and cross-tab sync — and nothing syncs either store between
 * devices or with mobile, whose modules use their own keys.
 *
 * @design Two stores on purpose, and mobile keys left apart on purpose
 *
 * A new setting belongs in `GamePreferencesContext` when many screens read
 * it at once or the server has to know it before hydration (the cookie hint
 * that shapes the `/games/play` skeleton); it belongs here when one practice
 * screen owns it. Folding either into the other was weighed and rejected:
 * this hook is per-instance state shared with mobile, so carrying the
 * provider's cookie writes, `storage`-event sync and hydration-time defaults
 * would push web-only behaviour into `packages/features`, while moving
 * per-module settings into the provider would re-render every board consumer
 * on a practice change and move six keys for no gain. The two already share
 * the layer below (`readJson` / `writeJson` over the same adapter).
 *
 * Mobile's keys (`COORDINATE_QUIZ_SETTINGS`, …) are not renamed to match. A
 * key in a browser and a key in AsyncStorage never meet — nothing syncs them
 * — and the schemas behind matching module names differ in meaning (web's
 * legal-moves drills one piece or `random`; mobile's keeps a list of pieces
 * plus a time limit), so a shared name would claim a compatibility that does
 * not exist. If settings ever sync through an account, that work defines one
 * versioned schema per module and migrates both platforms' keys into it:
 * read the new key, else read and convert the old one and write the new one,
 * and delete the old key only a release or two later, since an older build
 * still open in another tab, or a rolled-back deploy, reads the old key.
 */
export function useLocalStorageSettings<T extends Record<string, unknown>>(
  storageKey: string,
  defaults: T,
  guards: { [K in keyof T]: FieldGuard<T[K]> }
): UsePersistentSettingsReturn<T> {
  // The hook reads `validate` through a ref, so a new function per render
  // costs nothing; the memo only keeps the identity stable for readers.
  const validate = useMemo(() => (parsed: unknown) => pickValidFields<T>(parsed, guards), [guards]);
  return usePersistentSettings<T>({
    storageKey,
    defaults,
    storage: localStorageAdapter,
    validate,
  });
}
