/**
 * Best-effort slug suggestion from a free-form title. Lowercases, collapses
 * whitespace and any non-`[a-z0-9-]` characters into hyphens, then trims
 * stray delimiters. The output may still fail a caller's slug pattern for
 * pathological inputs (e.g. an all-symbol or fully non-Latin title yields
 * `""`), so callers MUST treat the result as a *suggestion*: re-run their own
 * validation before submission, and never overwrite a slug with `""`.
 *
 * Shared by every authoring form that offers a "Generate from title" helper
 * (chunks, admin articles, admin announcements) so the three cannot drift
 * into producing different slugs for the same title.
 */
export function deriveSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
