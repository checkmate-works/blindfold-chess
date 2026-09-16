/**
 * Read the `{ error }` code out of a failed internal-API response.
 *
 * This app's route handlers report a rejection as a JSON body with a string
 * `error` field (`invalid_file_type`, `file_too_large`, `post_deleted`, …),
 * which callers map to a message or an i18n key. Reading that code is worth
 * doing — but it must never be able to fail, which is why every step here
 * degrades to `undefined` instead of throwing.
 *
 * A failing response is precisely the case where the body may not be ours at
 * all. A platform 502 or gateway timeout answers with an HTML page; a
 * function killed mid-flight answers with nothing; a connection dropped after
 * the headers arrived makes the body stream reject while it is being read. In
 * all three `response.json()` rejects, and an unguarded `await` would replace
 * the failure the caller set out to report with `SyntaxError: Unexpected
 * token '<'`. The user is then shown a JSON parse error where "upload failed"
 * belonged, and the real status is lost. The shape checks after the parse are
 * the same argument one level in: a body that is `null`, an array, or carries
 * a non-string `error` holds no code we could display.
 *
 * Returning `undefined` rather than a fallback string keeps the wording with
 * the caller. The four call sites want different things from a miss — one
 * switches on the code and falls through to a translated message, the others
 * substitute an i18n key or a literal — so no single default belongs here.
 */
export async function readApiError(response: Response): Promise<string | undefined> {
  const body: unknown = await response.json().catch(() => undefined);
  if (typeof body !== 'object' || body === null || !('error' in body)) return undefined;
  return typeof body.error === 'string' ? body.error : undefined;
}
