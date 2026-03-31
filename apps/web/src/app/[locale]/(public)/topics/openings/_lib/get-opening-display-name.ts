/**
 * Resolves the display name for an opening by checking the translation first,
 * falling back to the original English name if no translation exists.
 *
 * Works with both server-side `getTranslations` and client-side `useTranslations`
 * results for the `topics.openings.names` namespace.
 */
export function getOpeningDisplayName(
  nameT: (key: never) => string,
  slug: string,
  fallbackName: string
): string {
  const translated = nameT(slug as never);
  return translated === `topics.openings.names.${slug}` ? fallbackName : translated;
}
