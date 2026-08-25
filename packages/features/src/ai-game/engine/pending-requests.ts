export type PendingRequestKey = string | number;

type PendingResolver<TValue> = {
  resolve: (value: TValue) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export type PendingRequestOptions = {
  /** Deadline for the response, in milliseconds. */
  timeoutMs: number;
  /** Message of the `Error` the promise rejects with once the deadline passes. */
  timeoutMessage: string;
  /**
   * Side effect that actually dispatches the command (a `postMessage`, a
   * channel write, ...). Invoked **after** the resolver is registered so a
   * response that arrives synchronously still finds its slot. If it throws,
   * the slot is released and the returned promise rejects with the thrown
   * error — a request that was never dispatched must not occupy a slot nor
   * run out its deadline.
   */
  dispatch: () => void;
};

/**
 * Registry of in-flight request/response pairs over an asynchronous, one-way
 * message pipe (a Web Worker, a WebView bridge, an engine process).
 *
 * Every such pipe needs the same three protections, and getting any of them
 * wrong hangs the caller rather than failing it:
 *
 * - **A resolver per outstanding request**, keyed so a response can be routed
 *   back to the caller that asked for it. Protocols that can only have one
 *   request of a kind outstanding (UCI's `uciok`) use a constant key; protocols
 *   that multiplex (an inference worker echoing a correlation id) use the id.
 * - **A deadline on every request.** A peer that simply never answers is
 *   indistinguishable from one that is still working, so the only way a caller
 *   ever learns about it is a timer the caller itself armed.
 * - **Fail-every-pending on a fatal pipe error.** When the worker dies, no
 *   response is ever coming; awaiters must learn that immediately instead of
 *   sitting out their full deadline and then reporting a timeout, which reads
 *   in error trackers as "the engine was slow" rather than "the engine died".
 *
 * The registry is deliberately ignorant of the wire protocol: it never
 * inspects a message, and the owner decides which key a given response
 * belongs to. That is what lets the UCI text protocol and the Maia binary
 * message protocol share it.
 *
 * A key may hold only one outstanding request at a time. Re-using a key that
 * is still in flight rejects the *new* request rather than displacing the
 * old one, because displacing it would strand the original awaiter forever —
 * exactly the failure mode this class exists to prevent.
 */
export class PendingRequests<TValue> {
  private entries = new Map<PendingRequestKey, PendingResolver<TValue>>();

  /** Number of requests currently awaiting a response. */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Register a resolver under `key`, dispatch the command, and return the
   * promise that settles when the response arrives, the deadline passes, or
   * the pipe fails.
   */
  request(
    key: PendingRequestKey,
    { timeoutMs, timeoutMessage, dispatch }: PendingRequestOptions,
  ): Promise<TValue> {
    if (this.entries.has(key)) {
      return Promise.reject(
        new Error(`Request already in flight for key: ${String(key)}`),
      );
    }

    return new Promise<TValue>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.entries.delete(key);
        reject(new Error(timeoutMessage));
      }, timeoutMs);

      this.entries.set(key, { resolve, reject, timer });

      try {
        dispatch();
      } catch (error) {
        this.entries.delete(key);
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Resolve the request registered under `key`. Returns `false` when no such
   * request is outstanding — a late or duplicated response is a normal event
   * on a pipe with deadlines, not an error.
   */
  settle(key: PendingRequestKey, value: TValue): boolean {
    const entry = this.take(key);
    if (!entry) return false;
    entry.resolve(value);
    return true;
  }

  /** Reject the request registered under `key`. Returns `false` if there is none. */
  fail(key: PendingRequestKey, reason: Error): boolean {
    const entry = this.take(key);
    if (!entry) return false;
    entry.reject(reason);
    return true;
  }

  /**
   * Reject every outstanding request. For fatal pipe failures (worker crash,
   * teardown that the awaiter must observe) where no response can arrive.
   */
  failAll(reason: Error): void {
    const outstanding = [...this.entries.values()];
    this.entries.clear();
    for (const entry of outstanding) {
      clearTimeout(entry.timer);
      entry.reject(reason);
    }
  }

  /**
   * Drop every outstanding request without settling it, cancelling its timer.
   * For expected teardown where the caller's promise is not meant to observe
   * a failure — the promise simply never settles, and no timer keeps the
   * process (or a fake-timer test clock) alive.
   */
  abandonAll(): void {
    for (const entry of this.entries.values()) {
      clearTimeout(entry.timer);
    }
    this.entries.clear();
  }

  private take(key: PendingRequestKey): PendingResolver<TValue> | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    clearTimeout(entry.timer);
    return entry;
  }
}
