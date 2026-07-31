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
