/**
 * Shared time bookkeeping for retention-based cron jobs (reapers, the account
 * purge): the eligibility cutoff, an optional wall-clock budget gate, and the
 * `{ startedAt, finishedAt }` report stamps.
 *
 * Only the bookkeeping is shared — each job keeps its own processing loop
 * (re-select-and-delete, select-once-then-iterate, storage-batch), because
 * those genuinely differ. This avoids a leaky one-size-fits-all batch runner
 * while removing the repeated `now ?? new Date()` / `cutoff` / `deadline`
 * arithmetic and the duplicated definition of "over budget".
 */
export type RetentionRunOptions = {
  /** Override the clock (tests). Defaults to the current instant. */
  now?: Date;
  /** Rows whose retention timestamp is `< now − retentionMs` are eligible. */
  retentionMs: number;
  /**
   * Wall-clock budget for the run. Omit for jobs that are not time-boxed
   * (then {@link RetentionRun.isOverBudget} is always `false`).
   */
  budgetMs?: number;
};

export type RetentionRun = {
  /** Eligibility cutoff: rows with their retention timestamp `< cutoff` are in scope. */
  cutoff: Date;
  /** Instant the run started (a snapshot of `now`). */
  startedAt: Date;
  /** True once the wall-clock budget is spent. Always `false` when no `budgetMs` was given. */
  isOverBudget: () => boolean;
  /** ISO `{ startedAt, finishedAt }` for the run report. Call once, at the end. */
  stamps: () => { startedAt: string; finishedAt: string };
};

export function startRetentionRun(opts: RetentionRunOptions): RetentionRun {
  const now = opts.now ?? new Date();
  const startedAt = new Date(now);
  const cutoff = new Date(now.getTime() - opts.retentionMs);
  const deadline = opts.budgetMs === undefined ? null : Date.now() + opts.budgetMs;

  return {
    cutoff,
    startedAt,
    isOverBudget: () => deadline !== null && Date.now() >= deadline,
    stamps: () => ({
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
    }),
  };
}
