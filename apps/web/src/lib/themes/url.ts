/**
 * Build the glossary URL for a term: its `/glossary/<slug>` detail page.
 * Centralizes the shape so every theme-tag surface (position detail pages,
 * the tag modal, edit-request diffs) links to the same canonical place.
 *
 * Lives in its own module (no DB / Drizzle imports) so client
 * components can import it without dragging the `postgres` package
 * into the browser bundle.
 */
export function buildGlossaryUrlForSlug(slug: string): string {
  return `/glossary/${slug}`;
}
