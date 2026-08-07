"use client";

import { useCallback, useRef } from "react";

import { useLatestRef } from "../common/use-latest-ref";

export type UseBufferedQuestionsOptions = {
  /** Size of the batch generated on first use. Default 200. */
  initialCount?: number;
  /** Size of each batch appended on refill. Default 100. */
  refillCount?: number;
  /**
   * Refill when the read index gets within this many items of the end of the
   * buffer, so the generator never runs dry mid-session. Default 10.
   */
  refillThreshold?: number;
};

/**
 * Serves questions sequentially from a pre-generated buffer, appending a new
 * batch whenever the remaining supply drops to `refillThreshold`.
 *
 * `makeBatch` is read through a latest-ref on every (re)fill, so a generator
 * that closes over settings (e.g. the selected piece types) picks up new
 * values on the next refill *without* discarding questions already buffered —
 * matching the behavior of the session hooks this was extracted from, which
 * never reset their buffer when settings changed mid-session.
 *
 * Returns a referentially stable `generateQuestion` callback suitable for
 * passing straight to `useTimedSession`.
 */
export function useBufferedQuestions<T>(
  makeBatch: (count: number) => T[],
  {
    initialCount = 200,
    refillCount = 100,
    refillThreshold = 10,
  }: UseBufferedQuestionsOptions = {},
): () => T {
  const makeBatchRef = useLatestRef(makeBatch);

  const optionsRef = useLatestRef({
    initialCount,
    refillCount,
    refillThreshold,
  });

  const batchRef = useRef<T[] | null>(null);
  const indexRef = useRef(0);

  return useCallback((): T => {
    let batch = (batchRef.current ??= makeBatchRef.current(
      optionsRef.current.initialCount,
    ));

    if (indexRef.current >= batch.length - optionsRef.current.refillThreshold) {
      batch = [
        ...batch,
        ...makeBatchRef.current(optionsRef.current.refillCount),
      ];
      batchRef.current = batch;
    }

    const question = batch[indexRef.current];
    indexRef.current += 1;
    return question;
  }, []);
}
