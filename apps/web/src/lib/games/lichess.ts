import 'server-only';

/**
 * Lichess game export client for the topic post attachment flow.
 *
 * @description
 * One-shot PGN fetch for a Lichess game by its 8-character game ID.
 * Used by the attachment server action when a user pastes a Lichess
 * URL instead of raw PGN. The fetched PGN is then re-validated by
 * `validateAttachedPgn` before being persisted, so this module's only
 * job is to (a) reach Lichess safely, (b) cap response size, and
 * (c) throttle outbound requests process-wide.
 *
 * @design Process-local token bucket
 *
 * Lichess publishes no concrete rate threshold but recommends backing
 * off on 429 for at least 60 s. We pre-throttle at 30 req/min process
 * wide via a token bucket so a single Next.js instance cannot single-
 * handedly hammer the API. Per-user throttling is handled separately
 * by `RATE_LIMITS.createPostWithAttachment` (DB-backed).
 *
 * @design Defensive ID validation
 *
 * `fetchLichessGamePgn` accepts only canonical 8-character IDs. The
 * 12-character "player URL" form (e.g. `/abcd1234abcd/white`) is the
 * URL parser's responsibility to truncate to 8 chars before reaching
 * this layer. We re-assert the regex at entry so a caller bug shows
 * up as `invalid_id` rather than as a broken Lichess URL.
 */

const LICHESS_GAME_ID_RE = /^[a-zA-Z0-9]{8}$/;
const LICHESS_FETCH_TIMEOUT_MS = 5_000;
const LICHESS_MAX_RESPONSE_BYTES = 102_400;

const LICHESS_THROTTLE_TOKENS_PER_MINUTE = 30;
const LICHESS_THROTTLE_CAPACITY = 30;
const LICHESS_THROTTLE_COOLDOWN_MS = 60_000;

export type LichessFetchResult =
  | { ok: true; pgn: string; canonicalUrl: string }
  | {
      ok: false;
      error: 'invalid_id' | 'not_found' | 'rate_limited' | 'too_large' | 'fetch_failed';
    };

type ThrottleState = {
  tokens: number;
  lastRefillMs: number;
  cooldownUntilMs: number;
};

/**
 * Build a token-bucket throttle. Exposed as a pure factory so unit
 * tests can drive it with a fake clock instead of the real one.
 */
export function createLichessThrottle(opts: {
  tokensPerMinute: number;
  capacity: number;
  cooldownMs: number;
  now?: () => number;
}) {
  const now = opts.now ?? (() => Date.now());
  const refillRate = opts.tokensPerMinute / 60_000; // tokens per ms
  const state: ThrottleState = {
    tokens: opts.capacity,
    lastRefillMs: now(),
    cooldownUntilMs: 0,
  };

  function refill() {
    const t = now();
    const elapsed = t - state.lastRefillMs;
    if (elapsed > 0) {
      state.tokens = Math.min(opts.capacity, state.tokens + elapsed * refillRate);
      state.lastRefillMs = t;
    }
  }

  return {
    tryAcquire(): boolean {
      const t = now();
      if (t < state.cooldownUntilMs) return false;
      refill();
      if (state.tokens >= 1) {
        state.tokens -= 1;
        return true;
      }
      return false;
    },
    /** Mark the bucket cold (e.g. after a 429) for `opts.cooldownMs` ms. */
    cooldown() {
      state.cooldownUntilMs = now() + opts.cooldownMs;
    },
    /** Test-only: snapshot of bucket state. */
    _state(): Readonly<ThrottleState> {
      return state;
    },
  };
}

const defaultThrottle = createLichessThrottle({
  tokensPerMinute: LICHESS_THROTTLE_TOKENS_PER_MINUTE,
  capacity: LICHESS_THROTTLE_CAPACITY,
  cooldownMs: LICHESS_THROTTLE_COOLDOWN_MS,
});

/**
 * Fetch a Lichess game's PGN by gameId.
 *
 * @param gameId — MUST be a canonical 8-character Lichess game ID
 *   (`/^[a-zA-Z0-9]{8}$/`). 12-character player URLs must be truncated
 *   by the URL parsing layer (see SPEC1 §2-1) before reaching this
 *   function.
 *
 * Reuse semantics:
 *   Callers (typically `resolveLichessAttachmentPgn`) should first look
 *   up `topic_post_attachments` by `(source='lichess', source_game_id)`
 *   for a recently-saved PGN and skip this fetch when one is found.
 *   This function itself is purely a fetch — no DB side effects.
 */
export async function fetchLichessGamePgn(
  gameId: string,
  /** Test-only injection point. Defaults to the module-singleton throttle. */
  throttle: { tryAcquire: () => boolean; cooldown: () => void } = defaultThrottle
): Promise<LichessFetchResult> {
  if (!LICHESS_GAME_ID_RE.test(gameId)) {
    return { ok: false, error: 'invalid_id' };
  }

  if (!throttle.tryAcquire()) {
    return { ok: false, error: 'rate_limited' };
  }

  const url = `https://lichess.org/game/export/${gameId}`;
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), LICHESS_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/x-chess-pgn' },
      signal: ac.signal,
    });

    if (res.status === 404) return { ok: false, error: 'not_found' };
    if (res.status === 429) {
      throttle.cooldown();
      return { ok: false, error: 'rate_limited' };
    }
    if (!res.ok) return { ok: false, error: 'fetch_failed' };

    const reader = res.body?.getReader();
    if (!reader) return { ok: false, error: 'fetch_failed' };

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > LICHESS_MAX_RESPONSE_BYTES) {
        await reader.cancel();
        return { ok: false, error: 'too_large' };
      }
      chunks.push(value);
    }

    const merged = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.byteLength;
    }
    const pgn = new TextDecoder('utf-8').decode(merged);
    return { ok: true, pgn, canonicalUrl: `https://lichess.org/${gameId}` };
  } catch {
    return { ok: false, error: 'fetch_failed' };
  } finally {
    clearTimeout(timeout);
  }
}

/** Test-only: expose the module throttle for inspection. */
export const __testOnly = {
  defaultThrottle,
  LICHESS_GAME_ID_RE,
  LICHESS_MAX_RESPONSE_BYTES,
};
