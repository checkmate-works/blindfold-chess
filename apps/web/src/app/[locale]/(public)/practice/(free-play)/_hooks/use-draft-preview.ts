'use client';

import { useCallback, useEffect, useState } from 'react';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { useRouter } from '@/i18n/routing';
import { useLatestRef } from '@blindfold-chess/features/common/client';
import { flushSync } from 'react-dom';

/**
 * What a submit attempt decided: either it failed with a message to show, or
 * it succeeded and the author should be sent somewhere. Clearing the stored
 * draft is the caller's job, done before returning the path — the guard is
 * only relaxed after this resolves.
 */
type SubmitOutcome = { error: string } | { path: string };

type Options<TDraft> = {
  /**
   * Reads the draft out of sessionStorage. Called once after mount — never
   * during render, since it must return `null` on the server.
   */
  readDraft: () => TDraft | null;
  /** Where to bounce a direct URL hit that has no draft to preview. */
  fallbackPath: string;
  /** Shown when the submit action throws rather than returning an error. */
  submitErrorMessage: string;
};

/**
 * The state machine behind every "preview your draft, then commit it" step:
 * hydrate the draft from sessionStorage (bouncing back if there is none),
 * guard against losing it to an accidental navigation, and run the submit.
 *
 * Draft reading is deliberately an effect rather than a lazy `useState`
 * initializer: the read returns `null` during SSR (it is window-guarded) but
 * the decoded draft on the first client render, and React requires initial
 * state to match across hydration. Callers render a skeleton until `hydrated`.
 *
 * Both "submit" and "back to edit" flip an internal `submitted` flag inside
 * `flushSync` before navigating, so the unsaved-changes guard has already
 * relaxed by the time our own push fires and does not prompt about it.
 */
export function useDraftPreview<TDraft>({
  readDraft,
  fallbackPath,
  submitErrorMessage,
}: Options<TDraft>) {
  const router = useRouter();

  const [draft, setDraft] = useState<TDraft | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Held in a ref so an inline `() => readEditDraft(id)` does not re-run the
  // effect on every render; `fallbackPath` carries any id it depends on.
  const readDraftRef = useLatestRef(readDraft);

  useEffect(() => {
    const d = readDraftRef.current();
    if (!d) {
      router.replace(fallbackPath);
      return;
    }
    setDraft(d);
    setHydrated(true);
  }, [router, fallbackPath, readDraftRef]);

  const isDirty = hydrated && !submitted;
  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  /** Navigate away from an intact draft on purpose (e.g. "back to edit"). */
  const leave = useCallback(
    (path: string) => {
      flushSync(() => setSubmitted(true));
      router.push(path);
    },
    [router]
  );

  const submit = useCallback(
    async (perform: () => Promise<SubmitOutcome>) => {
      setPending(true);
      setError(null);
      try {
        const outcome = await perform();
        if ('error' in outcome) {
          setError(outcome.error);
          return;
        }
        flushSync(() => setSubmitted(true));
        router.push(outcome.path);
      } catch {
        setError(submitErrorMessage);
      } finally {
        setPending(false);
      }
    },
    [router, submitErrorMessage]
  );

  return { draft, hydrated, pending, error, isBlocking, confirm, cancel, submit, leave };
}
