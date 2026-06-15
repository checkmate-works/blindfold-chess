import type { useTranslations } from 'next-intl';

/**
 * Map a Server Action error code to its translated message under the
 * `practice.positionEditRequests.errors.*` namespace. Codes not in
 * `allowed` fall through as the raw token so unknown failures stay visible
 * instead of silently disappearing. Mirrors `localizeChunkError`.
 */
export function localizePositionEditRequestError(
  code: string,
  t: ReturnType<typeof useTranslations<'practice.positionEditRequests'>>,
  allowed: ReadonlySet<string>
): string {
  return allowed.has(code) ? (t as unknown as (k: string) => string)(`errors.${code}`) : code;
}
