import type { useTranslations } from 'next-intl';

type Translator = (key: string) => string;

/**
 * Map a Server Action's stable error code to a translated message, given the
 * set of codes the caller has messages for.
 *
 * Codes outside `allowed` fall through as the raw token, so an unknown failure
 * stays visible to the user — and to whoever reads the bug report — instead of
 * being flattened into a generic sentence that says nothing.
 *
 * `keyPrefix` is the path *under* the namespace `t` is bound to. The default
 * `"errors"` matches callers bound to e.g. `chunks.form`; a caller bound to the
 * wider `chunks` namespace passes `"form.errors"` so the lookup still resolves
 * to `chunks.form.errors.<code>`.
 *
 * The cast on `t` bypasses next-intl's compile-time key narrowing — `allowed`
 * is the runtime guarantee that the resolved key exists.
 */
export function localizeActionError<NS extends string>(
  code: string,
  t: ReturnType<typeof useTranslations<NS>>,
  allowed: ReadonlySet<string>,
  keyPrefix: string = 'errors'
): string {
  return allowed.has(code) ? (t as unknown as Translator)(`${keyPrefix}.${code}`) : code;
}

/**
 * Map a Server Action error code to a translated message by asking the message
 * catalogue whether it has one, falling back to `errors.generic`.
 *
 * The counterpart to {@link localizeActionError} for callers with no allow-list
 * to check against. Which of the two a surface uses is a real choice — showing
 * the raw code surfaces unknown failures, showing a generic sentence keeps the
 * UI tidy — so they stay separate rather than becoming one function with a
 * fallback switch.
 */
export function localizeActionErrorOrGeneric<NS extends string>(
  code: string,
  t: ReturnType<typeof useTranslations<NS>> & { has: (key: string) => boolean }
): string {
  const key = `errors.${code}`;
  return t.has(key)
    ? (t as unknown as Translator)(key)
    : (t as unknown as Translator)('errors.generic');
}
