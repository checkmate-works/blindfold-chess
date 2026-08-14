import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLichessThrottle, fetchLichessGamePgn } from './lichess';

describe('createLichessThrottle', () => {
  it('starts full and decrements on each acquire', () => {
    const now = 1_000;
    const t = createLichessThrottle({
      tokensPerMinute: 30,
      capacity: 3,
      cooldownMs: 60_000,
      now: () => now,
    });

    expect(t.tryAcquire()).toBe(true);
    expect(t.tryAcquire()).toBe(true);
    expect(t.tryAcquire()).toBe(true);
    expect(t.tryAcquire()).toBe(false);
  });

  it('refills tokens over time at the configured rate', () => {
    let now = 0;
    const t = createLichessThrottle({
      tokensPerMinute: 60, // 1 token/sec
      capacity: 2,
      cooldownMs: 60_000,
      now: () => now,
    });

    t.tryAcquire();
    t.tryAcquire();
    expect(t.tryAcquire()).toBe(false);

    // 1 second later → exactly 1 token refilled.
    now += 1_000;
    expect(t.tryAcquire()).toBe(true);
    expect(t.tryAcquire()).toBe(false);
  });

  it('cooldown blocks all acquires for cooldownMs even with refilled tokens', () => {
    let now = 0;
    const t = createLichessThrottle({
      tokensPerMinute: 600, // refills fast
      capacity: 5,
      cooldownMs: 60_000,
      now: () => now,
    });

    t.cooldown();
    expect(t.tryAcquire()).toBe(false);

    now += 30_000;
    expect(t.tryAcquire()).toBe(false);

    now += 30_001;
    expect(t.tryAcquire()).toBe(true);
  });
});

// ─── fetchLichessGamePgn — outbound HTTP error mapping ───
//
// `fetchLichessGamePgn` is intentionally side-effect-free apart from the
// outbound `fetch` call and the throttle bucket, so we drive it with:
//   - a fake throttle that always grants tokens (so the rate-limit branch
//     is not what we are exercising), and
//   - a stubbed global `fetch` so we can simulate every Lichess response
//     class — 200 (happy + oversized), 404, 429, 5xx, network error, and
//     `AbortSignal` timeout.
//
// The contract under test is: the function MUST return a typed
// `LichessFetchResult` for every failure mode and MUST NOT throw to the
// caller. Throwing would propagate an uncaught error into the Server
// Action and show as a 500 to the end user.

function alwaysOpenThrottle() {
  return {
    tryAcquire: () => true,
    cooldown: vi.fn(),
  };
}

function createBodyStream(chunks: Uint8Array[]) {
  let i = 0;
  return {
    getReader() {
      return {
        async read() {
          if (i < chunks.length) {
            return { value: chunks[i++], done: false };
          }
          return { value: undefined, done: true };
        },
        async cancel() {
          i = chunks.length;
        },
      };
    },
  };
}

describe('fetchLichessGamePgn — error mapping', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns 'invalid_id' for non-canonical 12-char id without consulting fetch", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const result = await fetchLichessGamePgn('abcd1234abcd', alwaysOpenThrottle());
    expect(result).toEqual({ ok: false, error: 'invalid_id' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 'invalid_id' for empty string", async () => {
    const result = await fetchLichessGamePgn('', alwaysOpenThrottle());
    expect(result).toEqual({ ok: false, error: 'invalid_id' });
  });

  it("returns 'rate_limited' when the throttle is exhausted", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const closed = { tryAcquire: () => false, cooldown: vi.fn() };
    const result = await fetchLichessGamePgn('abcd1234', closed);
    expect(result).toEqual({ ok: false, error: 'rate_limited' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 'not_found' on 404", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 404,
      ok: false,
      body: createBodyStream([]),
    }) as unknown as typeof fetch;

    const result = await fetchLichessGamePgn('abcd1234', alwaysOpenThrottle());
    expect(result).toEqual({ ok: false, error: 'not_found' });
  });

  it("returns 'rate_limited' on 429 and trips the throttle cooldown", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 429,
      ok: false,
      body: createBodyStream([]),
    }) as unknown as typeof fetch;

    const throttle = alwaysOpenThrottle();
    const result = await fetchLichessGamePgn('abcd1234', throttle);
    expect(result).toEqual({ ok: false, error: 'rate_limited' });
    expect(throttle.cooldown).toHaveBeenCalledTimes(1);
  });

  it("returns 'fetch_failed' for non-2xx, non-404, non-429 (e.g. 500)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 500,
      ok: false,
      body: createBodyStream([]),
    }) as unknown as typeof fetch;

    const result = await fetchLichessGamePgn('abcd1234', alwaysOpenThrottle());
    expect(result).toEqual({ ok: false, error: 'fetch_failed' });
  });

  it("returns 'fetch_failed' when the response has no body stream", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      body: null,
    }) as unknown as typeof fetch;

    const result = await fetchLichessGamePgn('abcd1234', alwaysOpenThrottle());
    expect(result).toEqual({ ok: false, error: 'fetch_failed' });
  });

  it("returns 'fetch_failed' when fetch itself rejects (network error)", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(
        new TypeError('NetworkError when attempting to fetch')
      ) as unknown as typeof fetch;

    const result = await fetchLichessGamePgn('abcd1234', alwaysOpenThrottle());
    expect(result).toEqual({ ok: false, error: 'fetch_failed' });
  });

  it("returns 'fetch_failed' when AbortError fires (timeout simulated)", async () => {
    // The implementation uses `AbortController` + `setTimeout`; we simulate
    // the timeout having already fired by rejecting with AbortError.
    globalThis.fetch = vi.fn().mockImplementation(() => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    }) as unknown as typeof fetch;

    const result = await fetchLichessGamePgn('abcd1234', alwaysOpenThrottle());
    expect(result).toEqual({ ok: false, error: 'fetch_failed' });
  });

  it("returns 'too_large' when the streamed body exceeds 100 KiB", async () => {
    // The implementation caps at 102_400 bytes (LICHESS_MAX_RESPONSE_BYTES).
    // Send two chunks that together exceed the cap.
    const chunk1 = new Uint8Array(60_000).fill(0x61); // 'a'
    const chunk2 = new Uint8Array(50_000).fill(0x62); // 'b' — overflows on 2nd chunk

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      body: createBodyStream([chunk1, chunk2]),
    }) as unknown as typeof fetch;

    const result = await fetchLichessGamePgn('abcd1234', alwaysOpenThrottle());
    expect(result).toEqual({ ok: false, error: 'too_large' });
  });

  it('returns ok with decoded pgn and canonicalUrl on a 200 response', async () => {
    const pgn = '[Event "x"]\n\n1. e4 e5';
    const bytes = new TextEncoder().encode(pgn);

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      body: createBodyStream([bytes]),
    }) as unknown as typeof fetch;

    const result = await fetchLichessGamePgn('abcd1234', alwaysOpenThrottle());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pgn).toBe(pgn);
      expect(result.canonicalUrl).toBe('https://lichess.org/abcd1234');
    }
  });

  it('issues the request to lichess.org/game/export/{id} with PGN Accept header', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      body: createBodyStream([new TextEncoder().encode('1. e4 e5')]),
    });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await fetchLichessGamePgn('abcd1234', alwaysOpenThrottle());
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://lichess.org/game/export/abcd1234');
    expect((init as { headers: Record<string, string> }).headers.Accept).toBe(
      'application/x-chess-pgn'
    );
  });
});
