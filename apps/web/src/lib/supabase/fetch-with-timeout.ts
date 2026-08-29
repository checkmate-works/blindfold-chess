import { createFetchWithTimeout } from '@/lib/http/fetch-with-timeout';

/**
 * The deadline every Supabase HTTP call gets.
 *
 * Every Supabase call made during a server render (`auth.getUser()` in
 * `getOptionalUser`, JWKS fetches in the proxy) sits on the critical path of
 * an RSC stream, where a hung connection holds the stream open — which the
 * user sees as a navigation whose skeleton never resolves, until the
 * platform's maxDuration kill.
 *
 * Ten seconds is generous next to the observed sub-second auth round trips; a
 * cold start plus a retry still fits, while a genuine hang surfaces in ten
 * seconds instead of never.
 */
const SUPABASE_FETCH_TIMEOUT_MS = 10_000;

export const fetchWithTimeout = createFetchWithTimeout(SUPABASE_FETCH_TIMEOUT_MS);
