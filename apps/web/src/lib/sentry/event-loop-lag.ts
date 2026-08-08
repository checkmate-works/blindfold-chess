import { type IntervalHistogram, monitorEventLoopDelay } from 'node:perf_hooks';

/**
 * Event-loop delay monitor for the Node.js server process.
 *
 * @design Why this exists
 * A query deadline on its own cannot say whether the query went unanswered or
 * whether this process simply stopped listening: postgres.js flushes protocol
 * bytes from JS, so a loop blocked by CPU work leaves a message half-sent, and
 * — because Node runs expired timers before pending I/O when the loop resumes
 * — can fire the deadline against an answer already sitting in the socket
 * buffer.
 *
 * This module is what tells the two apart. `query-deadline.ts` attaches a
 * snapshot (plus the timer's own measured overshoot) to every
 * `QueryDeadlineError`, and `sentry.server.config.ts` lifts the numbers into
 * searchable tags. Delay in the seconds while a deadline fires means a blocked
 * loop and an innocent database; a flat histogram with on-schedule timers
 * points at the connection path (pool queue, pooler, network) instead — which
 * is what production readings have actually shown.
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
