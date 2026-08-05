/**
 * A `fetch` wrapper that aborts after a deadline.
 *
 * @design Why Supabase clients need this
 * Every Supabase HTTP call made during a server render (`auth.getUser()` in
 * `getOptionalUser`, JWKS fetches in the proxy) sits on the critical path of
 * an RSC stream. `fetch` has no default timeout, so a hung connection holds
 * the stream open — observed in production (2026-08) as a navigation whose
 * skeleton never resolves until the platform's maxDuration kill at 300s. See
 * the navigation-stall entry in CLAUDE.md's Known Issues.
 *
 * The factory exists so tests can use a short deadline; production callers
 * use the pre-configured {@link fetchWithTimeout}.
 */
export function createFetchWithTimeout(timeoutMs: number): typeof fetch {
  return (input, init) => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
    return fetch(input, { ...init, signal });
  };
}

/**
 * Generous next to the observed sub-second auth round trips; a cold start
 * plus a retry still fits, while a genuine hang surfaces in ten seconds
 * instead of never.
 */
const SUPABASE_FETCH_TIMEOUT_MS = 10_000;

export const fetchWithTimeout = createFetchWithTimeout(SUPABASE_FETCH_TIMEOUT_MS);
