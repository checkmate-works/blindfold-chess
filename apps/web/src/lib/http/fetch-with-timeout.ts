/**
 * Factory for a `fetch` wrapper that aborts after a deadline.
 *
 * @design Why every server-side outbound call wants one
 * `fetch` has no default timeout, so a peer that accepts the connection and
 * then stalls produces a promise that never settles. On the server that
 * promise sits on the critical path of an RSC stream, a route handler or a
 * Server Action, and holds the response open until the platform's
 * maxDuration kill — which the user sees as a navigation whose skeleton never
 * resolves. Worse, a hang is not a rejection, so whatever fallback the caller
 * wrote for "this service is unreachable" never runs: the degrade path is
 * unreachable for exactly the failure mode that most needs it.
 *
 * A deadline turns the hang into an ordinary rejection (a `TimeoutError`),
 * which the caller's existing failure path can degrade, retry or surface.
 * Adding one therefore changes behaviour on purpose: a call that hangs today
 * starts failing instead.
 *
 * @design Why a factory rather than one shared instance
 * The right budget is a property of the caller, not of HTTP: it has to fit
 * inside that route's `maxDuration` with room for the work that follows, and
 * a call whose failure means "render the simpler card" deserves a far shorter
 * one than a call the user is actively waiting on. Each caller declares its
 * own constant next to the reasoning that justifies it. Tests get the same
 * lever, so they can assert timeout behaviour in milliseconds.
 *
 * A caller-supplied `signal` keeps working: the request aborts on whichever
 * of the two fires first.
 */
export function createFetchWithTimeout(timeoutMs: number): typeof fetch {
  return (input, init) => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
    return fetch(input, { ...init, signal });
  };
}
