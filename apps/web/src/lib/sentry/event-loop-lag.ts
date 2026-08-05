import { type IntervalHistogram, monitorEventLoopDelay } from 'node:perf_hooks';

/**
 * Event-loop delay monitor for the Node.js server process.
 *
 * @design Why this exists
 * The 2026-08-05 profile-page stalls produced `QueryDeadlineError`s naming
 * queries that EXPLAIN proves execute in well under a millisecond, while
 * `pg_stat_activity` showed the backend in `wait_event = ClientRead` — the
 * database waiting on THIS process to finish sending its protocol bytes. That
 * combination indicts the app side of the wire, and the leading suspect is the
 * event loop: postgres.js flushes its protocol messages from JS, so a loop
 * blocked by CPU work (many concurrent SSR renders sharing one Fluid Compute
 * instance) leaves the message half-sent, stalls every in-flight query, and —
 * because Node runs expired timers before pending I/O when the loop resumes —
 * then fires the 10s query deadline against answers that are already sitting
 * in the socket buffer.
 *
 * This module is the measurement that decides it. `query-deadline.ts` attaches
 * a snapshot (plus the timer's own measured overshoot) to every
 * `QueryDeadlineError`, and `sentry.server.config.ts` lifts the numbers into
 * searchable tags. Delay in the seconds while a deadline fires confirms the
 * blocked-loop mechanism; a flat histogram with on-schedule timers moves the
 * suspicion to the connection path (pool queue, Supavisor, network) instead.
 *
 * @design Window semantics
 * The histogram is reset on every {@link snapshotEventLoopLag} call, so a
 * snapshot covers the interval since the previous snapshot (or process start).
 * When one stall rejects several queries at once, the first error of the burst
 * carries the loop stats and the rest read near-zero — each still carries its
 * own timer overshoot, which is measured per query and never shared.
 *
 * The monitor is memoized on `globalThis` (same pattern as the postgres
 * client) so dev-server hot reloads reuse one native histogram instead of
 * accumulating enabled monitors.
 */
const globalForLag = globalThis as unknown as {
  eventLoopDelayMonitor: IntervalHistogram | undefined;
};

const monitor =
  globalForLag.eventLoopDelayMonitor ??
  (() => {
    const created = monitorEventLoopDelay({ resolution: 20 });
    created.enable();
    return created;
  })();

globalForLag.eventLoopDelayMonitor = monitor;

export type EventLoopLagSnapshot = {
  /** Mean event-loop delay in ms over the window. */
  meanMs: number;
  /** 99th-percentile event-loop delay in ms over the window. */
  p99Ms: number;
  /** Worst single event-loop delay in ms over the window. */
  maxMs: number;
};

/** Nanoseconds → milliseconds, mapping the empty-histogram NaN/0 cases to 0. */
function toMs(nanoseconds: number): number {
  return Number.isFinite(nanoseconds) ? nanoseconds / 1e6 : 0;
}

/**
 * Read the delay stats accumulated since the last snapshot, then reset the
 * window. See the module docblock for what the numbers decide.
 */
export function snapshotEventLoopLag(): EventLoopLagSnapshot {
  const snapshot = {
    meanMs: toMs(monitor.mean),
    p99Ms: toMs(monitor.percentile(99)),
    maxMs: toMs(monitor.max),
  };
  monitor.reset();
  return snapshot;
}
