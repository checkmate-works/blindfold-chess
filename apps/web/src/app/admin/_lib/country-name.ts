/**
 * Resolve an ISO 3166-1 alpha-2 code to a full country name.
 *
 * The locale is fixed to English because the admin UI is rendered in English
 * only — every admin page loads its messages with
 * `getTranslations({ locale: 'en' })` — so there is no viewer locale to honour
 * here. Unknown or malformed codes fall back to the code itself rather than
 * throwing, which keeps a bad value in the database from breaking a whole row.
 *
 * Pure (no server-only imports) so client components may use it too.
 */
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export function countryName(code: string): string {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}
