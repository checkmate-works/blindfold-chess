import type { TranslatorWithHas } from '@/i18n/translator';

/**
 * Resolve a Server Action error value into display text. Errors come back
 * either as plain keys (resolved against the form's own namespace) or as
 * fully-qualified dotted paths (e.g. `attachment.error.tooLarge`, resolved
 * against the global translator). If neither resolves, fall back to the
 * form namespace's generic `error` key.
 */
export function resolvePostFormError(
  error: string | undefined,
  t: TranslatorWithHas,
  tGlobal: TranslatorWithHas
): string | null {
  if (!error) return null;
  if (t.has(error)) return t(error);
  if (error.includes('.') && tGlobal.has(error)) return tGlobal(error);
  return t('error');
}
