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
 * `success` key. That shape mismatch is why they never adopted
 * `handleServerActionError` and instead each hand-rolled a bare
 * `console.error` — or nothing at all — leaving their failures out of Sentry
 * entirely.
 *
 * `message` is required and is passed through untouched. What the admin
 * surface does with it is the caller's business and varies: the grants and
 * user-moderation actions return an error code that `adminErrorMessage` turns
 * into a sentence at the UI boundary, while the ads, articles, announcements
 * and coins actions still return prose their component renders as-is.
 * Defaulting this argument would invite a call site to silently change what
 * the admin sees.
 *
 * The literal type of `message` is preserved in the return type, so a caller
 * whose result type names the codes it may fail with — `AdminActionResult` —
 * still gets an error if the code handed here is not one of them.
 *
 * @param error - The caught error
 * @param context - A human-readable label for the log message (e.g. "[createGrant]")
 * @param message - The error string the caller returns, passed through unchanged
 */
export function handleAdminActionError<TMessage extends string>(
  error: unknown,
  context: string,
  message: TMessage
): { error: TMessage } {
  reportUnexpectedActionError(error, context);
  return { error: message };
}
