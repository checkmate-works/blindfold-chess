/* eslint-disable no-param-reassign -- Sentry's beforeSend contract is mutate-in-place: the hook edits the event it is handed (see `scrubInPlace`'s docblock); returning copies would silently drop fields Sentry attaches after our hook. */
/**
 * PII scrubbing helpers shared by Sentry `beforeSend` hooks on both the
 * server and edge runtimes.
 *
 * Sentry's Next.js integration automatically captures request URL / headers /
 * body on server- and edge-side exceptions. For password-related Server
 * Actions (e.g. `changePassword`, `resetPassword`) the exception payload can
 * therefore include plaintext passwords in `event.request.data`. The project
 * ships its own scrubbing pass in addition to Sentry's project-level "Scrub
 * Data" setting so credentials never leave the process.
 */

/**
 * Default list of field names considered sensitive. Matched case-insensitively
 * against object keys. Extend via the `sensitiveKeys` argument rather than
 * mutating this list.
 */
export const DEFAULT_SENSITIVE_KEYS = [
  'password',
  'currentPassword',
  'newPassword',
  'token_hash',
  'code',
  'token',
] as const;

const FILTERED = '[Filtered]';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Recursively walks a plain object / array structure, replacing any value
 * whose key matches (case-insensitively) one of `sensitiveKeys` with the
 * literal string `'[Filtered]'`. Mutates the input in place.
 *
 * Non-object / non-array values are left untouched. Circular references are
 * not expected in Sentry event payloads (they are JSON-serializable) and are
 * therefore not guarded against here.
 */
export function scrubInPlace(
  value: unknown,
  sensitiveKeys: readonly string[] = DEFAULT_SENSITIVE_KEYS
): void {
  const lowerKeys = new Set(sensitiveKeys.map((k) => k.toLowerCase()));
  walk(value, lowerKeys);
}

function walk(value: unknown, lowerKeys: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      walk(item, lowerKeys);
    }
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  for (const key of Object.keys(value)) {
    if (lowerKeys.has(key.toLowerCase())) {
      value[key] = FILTERED;
      continue;
    }
    walk(value[key], lowerKeys);
  }
}

/**
 * The subset of a Sentry event this module needs. Declared structurally rather
 * than imported from `@sentry/nextjs` so the module stays dependency-free and
 * its tests can hand it plain objects.
 */
type EventWithRequest = {
  request?: {
    cookies?: unknown;
    headers?: Record<string, string | undefined>;
    data?: unknown;
  };
};

/**
 * Strips credentials the Sentry Next.js integration attaches to server- and
 * edge-side exceptions: the cookie jar is replaced wholesale, the two header
 * spellings of `Authorization` and `Cookie` are removed, and the request body
 * goes through `scrubInPlace`.
 *
 * Headers are deleted rather than filtered because a session cookie or bearer
 * token has no redacted form worth keeping — unlike a form field, where
 * `'[Filtered]'` still tells you the field was submitted. Both capitalizations
 * are handled because the header bag Sentry builds preserves whatever casing
 * the runtime used, and the edge and node runtimes do not agree.
 *
 * Both `beforeSend` hooks call this, so a change to what counts as a
 * credential reaches the edge and node runtimes together.
 */
export function scrubRequestInPlace(event: EventWithRequest): void {
  const request = event.request;
  if (!request) return;

  if (request.cookies) {
    request.cookies = { scrubbed: true };
  }
  if (request.headers) {
    delete request.headers.authorization;
    delete request.headers.Authorization;
    delete request.headers.cookie;
    delete request.headers.Cookie;
  }
  if (request.data && typeof request.data === 'object') {
    scrubInPlace(request.data);
  }
}
