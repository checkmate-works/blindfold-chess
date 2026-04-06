import * as Sentry from '@sentry/nextjs';

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
  console.error(
    `${context}: unexpected error:`,
    error instanceof Error ? error.message : 'Unknown error'
  );
  Sentry.captureException(error);
  return { success: false, error: errorCode };
}
