import * as Sentry from '@sentry/nextjs';

/**
 * Log an unexpected error and report it to Sentry.
 *
 * @param error - The caught value. Not narrowed to `Error` on purpose: a
 *   `throw` can carry anything, and Sentry handles non-Error values.
 * @param context - Label identifying where this came from, prefixed to the
 *   log line (e.g. `'[purgeDeletedAccounts] hard delete failed'`).
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
export function captureError(error: unknown, context: string): void {
  console.error(`${context}:`, error);
  Sentry.captureException(error);
}
