import type { Sql } from 'postgres';

/**
 * How long a single query may take before it is abandoned.
 *
 * Every interactive query in this app is sub-second, so ten seconds is far
 * outside normal and still six times below the routes' `maxDuration = 60`,
 * leaving room for the failure to render an error and reach Sentry. The
 * trade-off is deliberate: a report-style query that legitimately needed more
 * than ten seconds would now fail, and should be made faster or given its own
 * budget rather than raising this for everything.
 */
const QUERY_DEADLINE_MS = 10_000;

/** How much of the SQL to keep in the error message. Enough to identify it. */
const SQL_EXCERPT_LENGTH = 300;

/**
 * Diagnostics captured at the moment the deadline fires, to tell WHERE the ten
 * seconds went. A deadline can mean two very different things:
 *
 * - The query truly went unanswered (slow execution, pool queue, pooler,
 *   network). The timer then fires on schedule: `overshootMs ≈ 0`.
 * - This process's event loop was blocked, so the query's protocol bytes were
 *   never flushed and the answer may even be sitting unread in the socket
 *   buffer — Node runs expired timers before pending I/O. The timer then fires
 *   LATE by however long the loop was blocked, which `overshootMs` measures.
 *
 * Everything here is computed only when a deadline has already fired, so it
 * costs nothing in the normal case. `sentry.server.config.ts` lifts these
 * fields into tags.
 */
export type QueryDeadlineDiagnostics = {
  /** How late the deadline timer fired past its scheduled time, in ms. */
  overshootMs: number;
  /** How many OTHER queries were started and still unsettled at this moment. */
  inflightCount: number;
  /**
   * The oldest of those, oldest first. An entry aged far past the deadline is
   * a wedged pool slot: its awaiter got a rejection long ago, but postgres.js
   * still holds the connection because the query never actually settled.
   */
  inflightOldest: Array<{ sql: string; ageMs: number; deadlined: boolean }>;
};

/** Coarse duration label — whole seconds, so Sentry grouping stays stable. */
function coarseSeconds(ms: number): string {
  return ms < 1000 ? '<1s' : `~${Math.round(ms / 1000)}s`;
}

/**
 * Thrown when a query passes {@link QUERY_DEADLINE_MS}. Carries the SQL — but
 * never the parameters, which hold user data.
 */
export class QueryDeadlineError extends Error {
  readonly sql: string;
  readonly diagnostics: QueryDeadlineDiagnostics;

  constructor(sql: string, diagnostics: QueryDeadlineDiagnostics) {
    super(
      `Query exceeded the ${QUERY_DEADLINE_MS}ms deadline ` +
        `(timer overshoot ${coarseSeconds(diagnostics.overshootMs)}): ${sql}`
    );
    this.name = 'QueryDeadlineError';
    this.sql = sql;
    this.diagnostics = diagnostics;
  }
}

/** Methods postgres.js mutates and returns `this` from, so the wrapper survives them. */
const CHAINABLE = new Set(['values', 'raw', 'execute']);

type PendingQuery = PromiseLike<unknown> & {
  cancel: () => void;
  strings?: readonly string[];
  string?: string;
};

function describeSql(query: PendingQuery, fallback: string): string {
  const text = query.string ?? query.strings?.join('?') ?? fallback;
  return text.length > SQL_EXCERPT_LENGTH ? `${text.slice(0, SQL_EXCERPT_LENGTH)}…` : text;
}

/**
 * Every started-but-unsettled query, keyed by the query object itself.
 *
 * @design Why entries outlive the deadline
 * An entry is removed when the UNDERLYING postgres.js query settles — not when
 * our raced wrapper rejects. A deadline rejection abandons the awaiter, but
 * postgres.js keeps the connection occupied until the query really answers,
 * errors, or is cancelled; that zombie window is precisely what this registry
 * exists to expose, and `inflightOldest` ages far past the deadline are how a
 * starving pool is told apart from a slow database. Wedged entries persist
 * until the instance dies, which is the signal, not a leak: their count is
 * bounded by the pool size plus the queue.
 */
const inflightQueries = new Map<
  PendingQuery,
  { sql: string; armedAt: number; deadlined: boolean }
>();

/** How many of the oldest in-flight queries a deadline error carries. */
const INFLIGHT_REPORT_LIMIT = 5;

/**
 * Test-only. The registry is module state, and a test file's never-settling
 * fake queries would otherwise accumulate across its tests.
 */
export function resetInflightRegistryForTests(): void {
  inflightQueries.clear();
}

/**
 * How long after its deadline a query may still settle before it is declared
 * wedged. Covers the cases that resolve themselves: a cancel that worked, or
 * an answer that was merely very late. What it deliberately does NOT wait out
 * is a dead socket — production showed those stay unsettled for 700+ seconds,
 * until TCP gives up on the peer.
 */
const WEDGE_GRACE_MS = 5_000;

/**
 * Longest a dispatched query can take to be declared either settled, deadlined
 * or wedged: the deadline plus its grace. Anything that needs the process to
 * stay alive until a query has been classified — the pool-drain keepalive in
 * `./index.ts` — must hold it at least this long after the last dispatch.
 */
export const WEDGE_SETTLE_WINDOW_MS = QUERY_DEADLINE_MS + WEDGE_GRACE_MS;

export type WedgedQueryInfo = { sql: string; ageMs: number };

type WedgedQueryHandler = (info: WedgedQueryInfo) => void;

let wedgedQueryHandler: WedgedQueryHandler | undefined;

/**
 * Statements eligible for the transparent deadline retry: reads only. A
 * deadlined write must never be re-issued — the first attempt may still be
 * executing (the deadline proves silence, not failure), and running it twice
 * is not idempotent. Re-running a SELECT is.
 */
const RETRYABLE_SQL = /^\s*select\b/i;

export type DeadlineRetry = {
  /**
   * Re-dispatch the same `unsafe(...)` arguments, on a FRESH pool if one can
   * be had (the caller is expected to rebuild first, debounced). Returns the
   * raw pending query, or undefined when a retry is not possible right now.
   */
  dispatch: (unsafeArgs: unknown[]) => PendingQuery | undefined;
  /** Outcome hook for logging/metrics. `retryMs` is the retry's own duration. */
  report: (outcome: 'rescued' | 'failed', sql: string, retryMs: number) => void;
};

let deadlineRetry: DeadlineRetry | undefined;

/**
 * How long to wait before each successive attempt after the pooler has refused
 * a connection for being at capacity. The condition clears as soon as any
 * other client returns a connection, which is a matter of milliseconds — these
 * delays are chosen to step over a burst (a deploy rollover, where old and new
 * instances briefly coexist) while staying far below anything a user reads as
 * slow. Jitter is added per attempt so that a set of victims refused in the
 * same instant does not march back in lockstep and collide again.
 */
const CAPACITY_RETRY_BACKOFF_MS = [150, 450];

/**
 * How long a single capacity-retry attempt may run before it is abandoned.
 *
 * An attempt is only dispatched after the pooler refused a connection, so a
 * healthy outcome is an answer within milliseconds; one that hangs has hit
 * something worse than a full pooler and is not worth waiting out. The bound
 * must also stay well under {@link QUERY_DEADLINE_MS}: if a hung attempt were
 * left to the ORIGINAL query's deadline timer, that path would respond by
 * rebuilding the pool — pointless against a full pooler (rebuilding frees no
 * budget) — and would leave the attempt itself uncancelled, quietly holding a
 * slot the pooler cannot spare.
 */
const CAPACITY_ATTEMPT_TIMEOUT_MS = 2_000;

/** Sleep one {@link CAPACITY_RETRY_BACKOFF_MS} step, with up to 100% jitter. */
function capacityBackoff(backoffMs: number): Promise<void> {
  return new Promise<void>((wake) => {
    const t = setTimeout(wake, backoffMs + Math.random() * backoffMs);
    // Node-only, and typed loosely because this file also compiles under the
    // DOM lib: a pending backoff must not hold a local process open.
    (t as { unref?: () => void }).unref?.();
  });
}

export type CapacityRetry = {
  /**
   * Re-dispatch the same `unsafe(...)` arguments on the CURRENT pool. Unlike
   * {@link DeadlineRetry.dispatch} this must NOT rebuild: the pool is not at
   * fault, the pooler is full, and discarding working connections would make
   * that worse.
   */
  dispatch: (unsafeArgs: unknown[]) => PendingQuery | undefined;
  /**
   * Re-open a transaction with the same `begin(...)` arguments on the CURRENT
   * client — never on the one the first attempt used, which a pool rebuild
   * during the backoff may already have ended. Same no-rebuild rule as
   * `dispatch`. The callback among the arguments is already wrapped (inner
   * client deadlines, and the did-it-start bookkeeping the retry relies on),
   * so it must be passed through as is. Returns the begin promise, or
   * undefined when a retry is not possible right now.
   */
  begin: (beginArgs: unknown[]) => PromiseLike<unknown> | undefined;
  /**
   * Outcome hook for logging/metrics. `waitedMs` is the total added latency.
   * `sql` is `'begin'` for a transaction retry.
   */
  report: (outcome: 'rescued' | 'failed', sql: string, attempts: number, waitedMs: number) => void;
};

let capacityRetry: CapacityRetry | undefined;

/**
 * Register the retry performed when the pooler refuses a connection because it
 * is at capacity. One handler at a time — same contract as
 * {@link setWedgedQueryHandler}.
 *
 * @design Why this retry may re-issue writes, when the deadline retry may not
 * The two failures look similar and are opposites. A deadline proves only
 * silence: the statement may be executing right now, so re-running anything
 * that is not a SELECT could apply it twice. A capacity refusal is the
 * pooler declining the CONNECTION — nothing was ever sent to Postgres, and
 * there is no first attempt to duplicate. Re-issuing is therefore safe for
 * any statement, which matters because this is the one failure mode that
 * would otherwise turn a write into an error page.
 *
 * Consequently {@link isPoolerAtCapacity} must stay narrow enough that it can
 * only match a refusal at connection setup. Widening it to cover errors that
 * a server might have already acted on would break that guarantee.
 *
 * @design What it covers
 * - Single statements issued through the top-level client's `unsafe()` — the
 *   path Drizzle uses outside a transaction.
 * - Transactions opened through the top-level client's `begin(callback)` —
 *   the path `db.transaction()` takes, and where most writes live. postgres.js
 *   acquires the connection by sending `BEGIN`, and only calls the callback
 *   once that has succeeded, so a refusal there means the transaction never
 *   started and the whole `begin(callback)` can simply be issued again. The
 *   retry re-runs it from the top; it never resumes a partial transaction.
 *   That argument holds only until the callback is called — from then on its
 *   statements may have reached Postgres — so the retry is gated on the
 *   callback not having started, whatever the error looks like. See
 *   `retryBeginWhilePoolerIsFull`.
 *
 * Not covered: statements inside a transaction and `savepoint` (the
 * connection is already held, and a retry cannot reproduce the transaction's
 * state), the `sql` tagged-template call (its fragments cannot be re-issued by
 * value), and `reserve()`. A refused `reserve()` would be as safe to retry as
 * `begin`, but nothing in this app calls it, and a retry path with no caller
 * would be untested against the shape real code gives it.
 */
export function setCapacityRetry(retry: CapacityRetry | undefined): void {
  capacityRetry = retry;
}

/**
 * Whether an error is the pooler saying it has no room for another client.
 *
 * Supavisor reports this as a Postgres error on the wire, so there is no
 * distinct SQLSTATE to key on — every one of these arrives as `XX000`, which
 * is also what unrelated internal errors use. The message text is the only
 * discriminator, and matching it exactly is what keeps the write-safety
 * argument in {@link setCapacityRetry} true.
 *
 * Both wordings are covered: session mode ("max clients reached in session
 * mode — max clients are limited to pool_size: N") and transaction mode
 * ("max client connections reached"), so this keeps working if the pooler
 * mode is ever switched back.
 */
export function isPoolerAtCapacity(error: unknown): boolean {
  const message = (error as { message?: unknown } | null)?.message;
  if (typeof message !== 'string') return false;
  return (
    message.includes('EMAXCONNSESSION') ||
    message.includes('max clients reached') ||
    message.includes('max client connections reached')
  );
}

/**
 * Register the retry performed when a SELECT hits its deadline. Established
 * connections have been seen swallowing queries whole — no answer, no error —
 * so the retry gives the render a second chance on a fresh connection instead
 * of failing it outright.
 * One handler at a time — same contract as {@link setWedgedQueryHandler}.
 */
export function setDeadlineRetry(retry: DeadlineRetry | undefined): void {
  deadlineRetry = retry;
}

/**
 * Register the callback fired when a deadlined query fails to settle within
 * {@link WEDGE_GRACE_MS}. A wedged query means its connection is dead but
 * still occupying a pool slot; `./index.ts` responds by rebuilding the pool.
 * One handler at a time — this is wiring, not an event bus.
 */
export function setWedgedQueryHandler(handler: WedgedQueryHandler | undefined): void {
  wedgedQueryHandler = handler;
}

/**
 * What the activity handler learns about the pool at the moment of the event:
 * how many queries are still in flight once the event (a dispatch or a
 * settlement) has been applied. Zero means the pool is quiet.
 */
export type QueryActivity = { inflightCount: number };

/**
 * Register the callback fired whenever a query is dispatched or settles.
 * `./index.ts` uses it to hold the instance out of Fluid Compute suspension
 * until the pool's idle reaper has had a chance to run — see the pool-drain
 * keepalive `@design` note there; the in-flight count lets it hold longer
 * while a query is still unclassified. One handler at a time — this is
 * wiring, not an event bus (same contract as {@link setWedgedQueryHandler}).
 */
export function setQueryActivityHandler(
  handler: ((activity: QueryActivity) => void) | undefined
): void {
  queryActivityHandler = handler;
}

let queryActivityHandler: ((activity: QueryActivity) => void) | undefined;

function trackInflight(query: PendingQuery, sql: string): void {
  inflightQueries.set(query, { sql, armedAt: performance.now(), deadlined: false });
  queryActivityHandler?.({ inflightCount: inflightQueries.size });
  const untrack = () => {
    inflightQueries.delete(query);
    queryActivityHandler?.({ inflightCount: inflightQueries.size });
  };
  // Subscribing is safe here: the caller has already subscribed via the race.
  Promise.resolve(query).then(untrack, untrack);
}

function snapshotInflight(self: PendingQuery) {
  const now = performance.now();
  const entry = inflightQueries.get(self);
  if (entry) entry.deadlined = true;
  const others = [...inflightQueries.entries()]
    .filter(([query]) => query !== self)
    .map(([, { sql, armedAt, deadlined }]) => ({
      sql,
      ageMs: Math.max(0, Math.round(now - armedAt)),
      deadlined,
    }))
    .sort((a, b) => b.ageMs - a.ageMs);
  return { inflightCount: others.length, inflightOldest: others.slice(0, INFLIGHT_REPORT_LIMIT) };
}

/**
 * Wrap one pending query so awaiting it rejects at the deadline — or, for a
 * SELECT dispatched on the top-level client, is transparently retried once on
 * a fresh pool (see {@link setDeadlineRetry}).
 *
 * The orchestration is built once and memoized: postgres.js only starts the
 * query when something reads `then`, and two subscriptions would mean two
 * timers on one query. It is hand-rolled rather than a `Promise.race` because
 * the retry path needs asymmetric behaviour after the deadline: a LATE answer
 * from the original query should still win, but a late REJECTION must not —
 * the retry's rebuild destroys the original's pool, and that induced
 * `CONNECTION_DESTROYED` would otherwise beat the retry to the caller.
 *
 * `retryArgs` carries the original `unsafe(...)` arguments and is only set
 * for queries where a retry is safe: top-level (not inside a transaction,
 * whose state a retry cannot reproduce) and re-dispatchable by value.
 */
function wrapQuery<T extends PendingQuery>(
  query: T,
  fallbackSql: string,
  retryArgs?: unknown[]
): T {
  let orchestrated: Promise<unknown> | undefined;
  const chained: string[] = [];

  const orchestrate = () => {
    if (!orchestrated) {
      const armedAt = performance.now();
      const sql = describeSql(query, fallbackSql);
      orchestrated = new Promise<unknown>((resolve, reject) => {
        let settled = false;
        let deadlineFired = false;
        const settle = (finish: () => void) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          finish();
        };

        const timer = setTimeout(() => {
          deadlineFired = true;
          // How late this callback runs past its schedule is the decisive
          // number: a blocked event loop delays the timer by the length of
          // the block. Clamped at 0 — fake-timer tests advance the clock
          // without advancing performance.now().
          const overshootMs = Math.max(0, performance.now() - armedAt - QUERY_DEADLINE_MS);
          // Ask the server to abort too, so a query that IS running does not
          // outlive the request that wanted it. Cancelling can throw when the
          // connection is already gone — which is the case we are here for.
          try {
            query.cancel();
          } catch {
            // Nothing to cancel; the rejection below is what matters.
          }
          // If neither the cancel nor a very late answer settles the query
          // within the grace period, its connection is a dead socket holding a
          // pool slot — hand it to the wedge handler (which rebuilds the pool).
          setTimeout(() => {
            if (inflightQueries.has(query)) {
              wedgedQueryHandler?.({ sql, ageMs: Math.round(performance.now() - armedAt) });
            }
          }, WEDGE_GRACE_MS);
          const error = new QueryDeadlineError(sql, {
            overshootMs,
            ...snapshotInflight(query),
          });

          // Guard on the actual re-dispatch text, not the describeSql label:
          // what matters for safety is the statement that would run again.
          const retryQuery =
            retryArgs && deadlineRetry && RETRYABLE_SQL.test(String(retryArgs[0]))
              ? safeDispatch(() => deadlineRetry?.dispatch(retryArgs))
              : undefined;
          if (!retryQuery) {
            settle(() => reject(error));
            return;
          }

          // Reproduce the original's chained shape (`.values()` etc.) before
          // subscribing starts the retry.
          for (const method of chained) {
            (retryQuery[method as keyof PendingQuery] as () => unknown)();
          }
          const retryStart = performance.now();
          const retryTimer = setTimeout(() => {
            try {
              retryQuery.cancel();
            } catch {
              // Same as above: a dead connection has nothing to cancel.
            }
            deadlineRetry?.report('failed', sql, Math.round(performance.now() - retryStart));
            settle(() => reject(error));
          }, QUERY_DEADLINE_MS);
          // Tracking gives the retry the same observability and keepalive
          // wiring as a first-class query (its settlement re-arms the
          // pool-drain keepalive, so its connection is reaped before suspend).
          trackInflight(retryQuery, sql);
          Promise.resolve(retryQuery).then(
            (rows) => {
              clearTimeout(retryTimer);
              deadlineRetry?.report('rescued', sql, Math.round(performance.now() - retryStart));
              settle(() => resolve(rows));
            },
            () => {
              clearTimeout(retryTimer);
              deadlineRetry?.report('failed', sql, Math.round(performance.now() - retryStart));
              // The original deadline error is the truthful failure; the
              // retry's own error is usually the induced pool teardown.
              settle(() => reject(error));
            }
          );
        }, QUERY_DEADLINE_MS);

        /**
         * Walk {@link CAPACITY_RETRY_BACKOFF_MS}, re-issuing until the pooler
         * has room. Only a capacity refusal is retried; any other error from
         * an attempt is the real answer and is handed straight to the caller.
         */
        const retryWhilePoolerIsFull = async (originalError: unknown) => {
          const startedAt = performance.now();
          let attempts = 0;
          for (const backoffMs of CAPACITY_RETRY_BACKOFF_MS) {
            await capacityBackoff(backoffMs);
            if (settled) return;

            const attempt = safeDispatch(() => capacityRetry?.dispatch(retryArgs!));
            if (!attempt) break;
            attempts += 1;
            for (const method of chained) {
              (attempt[method as keyof PendingQuery] as () => unknown)();
            }
            trackInflight(attempt, sql);
            let attemptTimedOut = false;
            const attemptTimer = setTimeout(() => {
              attemptTimedOut = true;
              try {
                attempt.cancel();
              } catch {
                // A dead connection has nothing to cancel.
              }
              if (settled) return;
              capacityRetry?.report(
                'failed',
                sql,
                attempts,
                Math.round(performance.now() - startedAt)
              );
              settle(() => reject(originalError));
            }, CAPACITY_ATTEMPT_TIMEOUT_MS);
            (attemptTimer as { unref?: () => void }).unref?.();
            try {
              const rows = await Promise.resolve(attempt);
              clearTimeout(attemptTimer);
              // An answer that arrives after something else settled the caller
              // (the attempt timeout, or the original deadline) is not a
              // rescue — reporting it as one would falsify the metrics.
              if (settled) return;
              capacityRetry?.report(
                'rescued',
                sql,
                attempts,
                Math.round(performance.now() - startedAt)
              );
              settle(() => resolve(rows));
              return;
            } catch (attemptError) {
              clearTimeout(attemptTimer);
              if (attemptTimedOut || settled) return;
              if (!isPoolerAtCapacity(attemptError)) {
                settle(() => reject(attemptError));
                return;
              }
            }
          }
          if (settled) return;
          capacityRetry?.report('failed', sql, attempts, Math.round(performance.now() - startedAt));
          settle(() => reject(originalError));
        };

        Promise.resolve(query).then(
          (value) => settle(() => resolve(value)),
          (queryError) => {
            // After the deadline the rejection is (typically) induced by the
            // retry's rebuild tearing down the original's pool — the retry
            // outcome governs, so ignore it.
            if (deadlineFired) return;
            // A pooler at capacity refused the connection, so nothing reached
            // Postgres and waiting for room is both safe and usually enough.
            if (retryArgs && capacityRetry && isPoolerAtCapacity(queryError)) {
              void retryWhilePoolerIsFull(queryError);
              return;
            }
            settle(() => reject(queryError));
          }
        );
      });
      trackInflight(query, sql);
    }
    return orchestrated;
  };

  const proxy = new Proxy(query, {
    get(target, property, receiver) {
      if (property === 'then' || property === 'catch' || property === 'finally') {
        const promise = orchestrate();
        return promise[property as 'then' | 'catch' | 'finally'].bind(promise);
      }
      if (typeof property === 'string' && CHAINABLE.has(property)) {
        return (...args: unknown[]) => {
          (target[property as keyof PendingQuery] as (...a: unknown[]) => unknown)(...args);
          chained.push(property);
          return proxy;
        };
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });

  return proxy;
}

/** A retry must never be able to crash the path that hosts it. */
function safeDispatch(dispatch: () => PendingQuery | undefined): PendingQuery | undefined {
  try {
    const dispatched = dispatch();
    return dispatched && isPendingQuery(dispatched) ? dispatched : undefined;
  } catch {
    return undefined;
  }
}

/** Whether a value looks like a pending postgres.js query. */
function isPendingQuery(value: unknown): value is PendingQuery {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PendingQuery).then === 'function' &&
    typeof (value as PendingQuery).cancel === 'function'
  );
}

/** What {@link CapacityRetry.report} receives as the statement for a transaction. */
const BEGIN_REPORT_LABEL = 'begin';

/**
 * One attempt at `begin(...)`: its arguments, with the callback instrumented
 * so the retry can tell whether the transaction has started.
 */
type BeginAttempt = {
  args: unknown[];
  /** Whether the callback has been called, i.e. the transaction is under way. */
  started: () => boolean;
  /** Milliseconds from `since` to the callback's start, or undefined if it never started. */
  startedAfterMs: (since: number) => number | undefined;
  /** Register what to do the moment the callback is called. */
  onStart: (listener: () => void) => void;
  /** From now on, make the callback throw instead of running if it is ever called. */
  abandon: () => void;
};

function prepareBeginAttempt(args: unknown[], wrapInner: (inner: Sql) => Sql): BeginAttempt {
  let startedAt: number | undefined;
  let abandoned = false;
  let onStart: (() => void) | undefined;
  return {
    args: args.map((arg) =>
      typeof arg === 'function'
        ? (inner: Sql, ...rest: unknown[]) => {
            if (abandoned) {
              // Thrown inside the callback, so postgres.js rolls back the empty
              // transaction and releases the connection it finally got.
              throw new Error('Transaction attempt abandoned: its caller was already answered');
            }
            startedAt = performance.now();
            onStart?.();
            return (arg as (...a: unknown[]) => unknown)(wrapInner(inner), ...rest);
          }
        : arg
    ),
    started: () => startedAt !== undefined,
    startedAfterMs: (since) =>
      startedAt === undefined ? undefined : Math.round(startedAt - since),
    onStart: (listener) => {
      onStart = listener;
    },
    abandon: () => {
      abandoned = true;
    },
  };
}

type BeginOutcome =
  | { kind: 'resolved'; value: unknown }
  | { kind: 'rejected'; error: unknown }
  | { kind: 'timed-out' };

/**
 * Wait for one retried `begin`, giving up if it has not reached its callback
 * within {@link CAPACITY_ATTEMPT_TIMEOUT_MS}.
 *
 * The timeout bounds only the wait for a connection, not the transaction: it
 * is cleared the moment the callback starts. A transaction may legitimately
 * run for seconds, and its statements are already bounded one by one by the
 * deadline on the transaction client; cutting it off mid-way would also mean
 * abandoning a transaction that is actually running. What the timeout guards
 * against is the same thing it guards against for a single statement: an
 * attempt that hangs before it has even got a connection has hit something
 * worse than a full pooler.
 *
 * Unlike a query, a pending `begin` has no `cancel()`, so walking away cannot
 * stop the attempt. {@link BeginAttempt.abandon} is what makes it safe: should
 * a connection turn up after the caller has been answered, the callback throws
 * before running anything and the transaction rolls back empty.
 */
function settleBeginAttempt(
  pending: PromiseLike<unknown>,
  attempt: BeginAttempt
): Promise<BeginOutcome> {
  return new Promise((settle) => {
    // A `begin` that calls its callback synchronously has already started by
    // now, and there is no connection left to wait for.
    const timer = attempt.started()
      ? undefined
      : setTimeout(() => {
          attempt.abandon();
          settle({ kind: 'timed-out' });
        }, CAPACITY_ATTEMPT_TIMEOUT_MS);
    (timer as { unref?: () => void } | undefined)?.unref?.();
    attempt.onStart(() => clearTimeout(timer));
    // After a timeout this still subscribes, which keeps the abandoned
    // attempt's eventual rejection from going unhandled.
    Promise.resolve(pending).then(
      (value) => {
        clearTimeout(timer);
        settle({ kind: 'resolved', value });
      },
      (error: unknown) => {
        clearTimeout(timer);
        settle({ kind: 'rejected', error });
      }
    );
  });
}

/**
 * Re-issue a whole `begin(...)` refused by a full pooler, walking
 * {@link CAPACITY_RETRY_BACKOFF_MS} through {@link CapacityRetry.begin}.
 *
 * The loop ends for good the first time an attempt's callback starts: from
 * that point the transaction has a connection, its statements may have
 * reached Postgres, and whatever it then resolves or rejects with is the
 * caller's answer — even an error that happens to look like a capacity
 * refusal, because re-running a started callback could apply its writes
 * twice. That is also the point at which the refusal counts as overcome, so
 * it is reported as `rescued`, with `waitedMs` measured up to the start rather
 * than including however long the transaction itself then ran.
 */
async function retryBeginWhilePoolerIsFull(
  args: unknown[],
  wrapInner: (inner: Sql) => Sql,
  originalError: unknown
): Promise<unknown> {
  const retryStartedAt = performance.now();
  const elapsed = () => Math.round(performance.now() - retryStartedAt);
  let attempts = 0;
  for (const backoffMs of CAPACITY_RETRY_BACKOFF_MS) {
    await capacityBackoff(backoffMs);

    const attempt = prepareBeginAttempt(args, wrapInner);
    let pending: PromiseLike<unknown> | undefined;
    try {
      pending = capacityRetry?.begin(attempt.args);
    } catch {
      // A retry must never be able to crash the path that hosts it.
      pending = undefined;
    }
    if (!pending) break;
    attempts += 1;

    const outcome = await settleBeginAttempt(pending, attempt);
    if (outcome.kind === 'timed-out') {
      capacityRetry?.report('failed', BEGIN_REPORT_LABEL, attempts, elapsed());
      throw originalError;
    }
    if (outcome.kind === 'resolved' || attempt.started()) {
      capacityRetry?.report(
        'rescued',
        BEGIN_REPORT_LABEL,
        attempts,
        attempt.startedAfterMs(retryStartedAt) ?? elapsed()
      );
      if (outcome.kind === 'resolved') return outcome.value;
      throw outcome.error;
    }
    if (!isPoolerAtCapacity(outcome.error)) throw outcome.error;
  }
  capacityRetry?.report('failed', BEGIN_REPORT_LABEL, attempts, elapsed());
  throw originalError;
}

/**
 * Open a transaction on the top-level client, re-issuing the whole
 * `begin(...)` if the pooler refused its connection — see the coverage notes
 * on {@link setCapacityRetry}. The first attempt runs on the client this
 * wrapper was built around; only retries go through
 * {@link CapacityRetry.begin}.
 */
async function beginWithCapacityRetry(
  open: (args: unknown[]) => unknown,
  args: unknown[],
  wrapInner: (inner: Sql) => Sql
): Promise<unknown> {
  const first = prepareBeginAttempt(args, wrapInner);
  try {
    return await open(first.args);
  } catch (error) {
    if (first.started() || !capacityRetry || !isPoolerAtCapacity(error)) throw error;
    return retryBeginWhilePoolerIsFull(args, wrapInner, error);
  }
}

/**
 * Give every query issued through `client` a client-side deadline.
 *
 * @design Why this exists at all
 * postgres.js has no timeout for a query once it has been dispatched — the
 * option surface is `connect_timeout` (the connect phase), `idle_timeout` and
 * `max_lifetime` (recycling idle connections), and `keep_alive` (TCP
 * keepalive). Nothing bounds a query that has been written to a socket and
 * never answered.
 *
 * The `statement_timeout` set in `./index.ts` does not close that gap: it is a
 * server-side setting that only starts counting once the backend begins
 * executing. A query waiting in the client's own queue, or sitting on a
 * half-open socket, or queued inside the transaction pooler for a backend, has
 * not started — so it can wait forever without ever raising SQLSTATE 57014.
 *
 * That is the shape production kept hitting: a render that never finished, no
 * DB error, no auth error, killed at `maxDuration` with nothing to show for
 * it. This wrapper turns that silence into a named error that identifies the
 * query.
 *
 * In Sentry the failure arrives as Drizzle's `Failed query: <sql>` with the
 * {@link QueryDeadlineError} as its `cause` — look at the linked exception to
 * tell a deadline apart from an ordinary query error.
 *
 * @design Where it hooks in
 * Drizzle issues every statement through `client.unsafe(...)`, chaining
 * `.values()` for some, and opens transactions through `client.begin(...)`.
 * Wrapping those — plus the tagged-template call itself, and the nested client
 * handed to a transaction callback — covers every path into the driver. A
 * shape that somehow slipped past would simply not get a deadline, which is
 * the behaviour that existed before this wrapper.
 *
 * @design Which paths retry
 * Only the top-level client's paths do. Its `unsafe()` statements get the
 * deadline retry (SELECTs only, see {@link setDeadlineRetry}) and the
 * pooler-at-capacity retry (any statement); its `begin(callback)` gets the
 * pooler-at-capacity retry for the whole transaction, as long as the refusal
 * came before the callback started (see {@link setCapacityRetry}). The client
 * handed to a transaction callback, and `savepoint` on it, get deadlines but
 * never a retry.
 */
export function withQueryDeadline(client: Sql): Sql {
  // `withRetry` marks the top-level client: only statements and transactions
  // dispatched there may be transparently retried. Inside a transaction a
  // retry would re-run one statement outside its transaction's state, so
  // inner clients never get retry powers.
  const wrapClient = (target: Sql, withRetry: boolean): Sql =>
    new Proxy(target, {
      // The client is itself callable, as the sql`...` tag. Template calls
      // carry live fragment values that cannot be re-dispatched by value, so
      // they never retry.
      apply(fn, thisArg, args: unknown[]) {
        const result = Reflect.apply(fn as unknown as (...a: unknown[]) => unknown, thisArg, args);
        return isPendingQuery(result) ? wrapQuery(result, String(args[0])) : result;
      },
      get(sql, property, receiver) {
        if (property === 'unsafe') {
          return (...args: unknown[]) => {
            const query = (sql.unsafe as (...a: unknown[]) => unknown)(...args);
            return isPendingQuery(query)
              ? wrapQuery(query, String(args[0]), withRetry ? args : undefined)
              : query;
          };
        }

        // Queries inside a transaction run on the client the callback is
        // handed, not on this one, so that client needs wrapping too.
        if (property === 'begin' || property === 'reserve' || property === 'savepoint') {
          // `savepoint` only exists on a transaction client, which this proxy
          // also wraps — hence the index through an untyped view.
          const open = (sql as unknown as Record<string, (...a: unknown[]) => unknown>)[property];
          const wrapInner = (inner: Sql) => wrapClient(inner, false);

          // Only a top-level `begin` may be re-issued on a capacity refusal:
          // a `savepoint` (or a nested client's `begin`) already sits inside a
          // transaction holding its connection.
          if (property === 'begin' && withRetry) {
            return (...args: unknown[]) =>
              beginWithCapacityRetry((attemptArgs) => open(...attemptArgs), args, wrapInner);
          }

          return (...args: unknown[]) => {
            const wrapped = args.map((arg) =>
              typeof arg === 'function'
                ? (inner: Sql, ...rest: unknown[]) =>
                    (arg as (...a: unknown[]) => unknown)(wrapInner(inner), ...rest)
                : arg
            );
            return open(...wrapped);
          };
        }

        const value = Reflect.get(sql, property, receiver);
        return typeof value === 'function' ? value.bind(sql) : value;
      },
    });

  return wrapClient(client, true);
}
