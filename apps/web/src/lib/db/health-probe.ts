/** A dispatched query as the probe sees it: awaitable, and cancellable. */
export type ProbeQuery = PromiseLike<unknown> & { cancel: () => void };

export type ProbeOutcome = 'ok' | 'unavailable';

/**
 * Race one already-dispatchable query against `timeoutMs`, reporting only
 * whether the database answered in time.
 *
 * Every failure collapses to `'unavailable'` — a rejected query, a pooler
 * refusal, a hang, or `dispatch` itself throwing (e.g. the driver refusing to
 * build a query) — because the only consumer is a health endpoint whose
 * answer is binary and must not expose why. The error value is deliberately
 * dropped here rather than passed up, so nothing downstream can leak it.
 *
 * On timeout the query is cancelled, so a probe against a hung pooler does not
 * keep waiting on a slot after its caller has been answered. Cancelling can
 * throw when the connection is already gone; that is the case being handled,
 * so it is swallowed.
 */
export async function probeDatabase(
  dispatch: () => ProbeQuery,
  timeoutMs: number
): Promise<ProbeOutcome> {
  let query: ProbeQuery;
  try {
    query = dispatch();
  } catch {
    return 'unavailable';
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs);
  });

  try {
    const winner = await Promise.race([
      Promise.resolve(query).then(() => 'answered' as const),
      timedOut,
    ]);
    if (winner === 'answered') return 'ok';
    try {
      query.cancel();
    } catch {
      // Nothing left to cancel on a dead connection.
    }
    return 'unavailable';
  } catch {
    return 'unavailable';
  } finally {
    clearTimeout(timer);
  }
}
