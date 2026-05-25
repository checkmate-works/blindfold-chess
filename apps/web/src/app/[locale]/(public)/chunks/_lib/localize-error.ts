import type { useTranslations } from 'next-intl';

/**
 * Maps a Server Action error code to its translated message. Codes not
 * in `allowed` fall through as the raw token so unknown failures stay
 * visible to the user (and the developer) instead of silently
 * disappearing.
 *
 * `keyPrefix` is the path *under* the namespace `t` was bound to. The
 * default `"errors"` matches callers bound to `chunks.form` or
 * `chunks.editRequests`. Callers bound to the wider `chunks` namespace
 * (e.g. components that also read `chunks.actions.*`) should pass
 * `"form.errors"` so the lookup still resolves to `chunks.form.errors.<code>`.
 *
 * The cast on `t` bypasses next-intl's compile-time key narrowing —
 * `allowed` is the runtime guarantee that the resolved key exists.
 */
export function localizeChunkError<NS extends string>(
  code: string,
  t: ReturnType<typeof useTranslations<NS>>,
  allowed: ReadonlySet<string>,
  keyPrefix: string = 'errors'
): string {
  return allowed.has(code) ? (t as unknown as (k: string) => string)(`${keyPrefix}.${code}`) : code;
}
