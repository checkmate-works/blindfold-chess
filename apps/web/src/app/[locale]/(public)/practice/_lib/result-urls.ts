/**
 * Default URL construction for practice result pages. Extracted from
 * `createPracticeResultClient` so the URL rules are pure and testable;
 * modules with special shapes override via the factory's `buildTryAgainUrl`
 * / `buildSettingsUrl` callbacks instead.
 */

/** Serialize extra params, skipping null values. */
export function buildParamString(values: Record<string, string | null>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null) {
      params.set(key, value);
    }
  }
  return params.toString();
}

/** Default "try again" destination: the module's challenge session. */
export function buildDefaultTryAgainUrl(
  locale: string,
  moduleSlug: string,
  extraParamValues: Record<string, string | null>
): string {
  return `/${locale}/practice/${moduleSlug}/challenge/session?${buildParamString(extraParamValues)}`;
}

/** Default "change settings" destination: the module's challenge setup. */
export function buildDefaultSettingsUrl(
  locale: string,
  moduleSlug: string,
  extraParamValues: Record<string, string | null>
): string {
  return `/${locale}/practice/${moduleSlug}/challenge?${buildParamString(extraParamValues)}`;
}
