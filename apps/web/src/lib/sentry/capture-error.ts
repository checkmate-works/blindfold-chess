import * as Sentry from '@sentry/nextjs';

/**
 * Log an unexpected error and report it to Sentry.
 *
 * @param error - The caught value. Not narrowed to `Error` on purpose: a
 *   `throw` can carry anything, and Sentry handles non-Error values.
 * @param context - Label identifying where this came from, prefixed to the
 *   log line (e.g. `'[purgeDeletedAccounts] hard delete failed'`).
 * @param scope - Optional Sentry `tags` / `extra` for the event. `extra` is
 *   also appended to the log line, so a caller that attaches request details
 *   for Sentry does not have to log them a second time by hand.
 *
 * @design Why this is its own function
 *
 * The console.error + captureException pair is what "we noticed something
 * went wrong" means in this codebase, and it was already implemented twice
 * inside wrappers that own a *response* as well —
 * {@link handleServerActionError} returns an action envelope,
 * `runCronJob` returns a 500. Callers with no response to produce (sitemap
 * builders, background jobs, best-effort cleanup paths) could not reuse
 * either, so fourteen of them hand-rolled the pair — and stringified the
 * error four different ways while doing it: `error.message` with an
 * `'Unknown error'` fallback, `error.message` with the raw value as
 * fallback, `error.message` unguarded, and the raw object.
 *
 * Logging the value itself is the one of those four worth keeping: it
 * preserves the stack for an `Error` and does not collapse a non-Error
 * throw to a useless string. The wrappers now delegate here, so their log
 * lines carry the same detail.
 */
export function captureError(error: unknown, context: string, scope?: CaptureErrorScope): void {
  if (scope?.extra) {
    console.error(`${context}:`, error, scope.extra);
  } else {
    console.error(`${context}:`, error);
  }
  // Only pass a second argument when there is one: an explicit `undefined`
  // changes the call's arity, which `toHaveBeenCalledWith(error)` assertions
  // across the suite treat as a different call.
  if (scope) {
    Sentry.captureException(error, scope);
  } else {
    Sentry.captureException(error);
  }
}

/** Sentry event context {@link captureError} forwards alongside the error. */
export interface CaptureErrorScope {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}
