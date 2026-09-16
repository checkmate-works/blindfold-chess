import { captureError } from '@/lib/sentry/capture-error';

/**
 * Report an unexpected Server Action failure to the console and Sentry.
 *
 * Shared by both response-shaped wrappers below so a failure produces the
 * same log line and the same Sentry event no matter which surface caught
 * it — only the value handed back to the caller differs. Grep for
 * `unexpected error` to find every one of them.
 */
function reportUnexpectedActionError(error: unknown, context: string): void {
  captureError(error, `${context}: unexpected error`);
}

/**
 * Handles unexpected errors in Server Action catch blocks.
 *
 * Logs the error to the console, reports it to Sentry, and returns
 * a standardized `{ success: false, error }` response.
 *
 * @param error - The caught error
 * @param context - A human-readable label for the log message (e.g. "[savePracticeResult] coordinate_quiz")
 * @param errorCode - The error code string returned to the client (default: 'unexpected_error')
 */
export function handleServerActionError(
  error: unknown,
  context: string,
  errorCode = 'unexpected_error'
): { success: false; error: string } {
  reportUnexpectedActionError(error, context);
  return { success: false, error: errorCode };
}

/**
 * Handles unexpected errors in admin Server Action catch blocks.
 *
 * Same reporting as {@link handleServerActionError}, different response:
 * admin actions return the `{ error }` branch of `ActionResult`, with no
 * `success` key and with a message the admin UI renders verbatim (admin
 * surfaces are English-only and not translated), rather than an error code
 * a client component maps to a translation. That shape mismatch is why the
 * admin actions never adopted `handleServerActionError` and instead each
 * hand-rolled a bare `console.error` — or nothing at all — leaving their
 * failures out of Sentry entirely.
 *
 * `message` is required: it is the string the caller already returns today,
 * and defaulting it would invite a call site to silently change what the
 * admin sees.
 *
 * @param error - The caught error
 * @param context - A human-readable label for the log message (e.g. "[createGrant]")
 * @param message - The message returned to the admin UI, unchanged
 */
export function handleAdminActionError(
  error: unknown,
  context: string,
  message: string
): { error: string } {
  reportUnexpectedActionError(error, context);
  return { error: message };
}
