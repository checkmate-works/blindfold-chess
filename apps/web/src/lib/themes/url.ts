/**
 * Build the glossary URL for a term. The glossary doesn't expose a
 * `/glossary/[slug]` detail route — terms are presented in
 * letter-grouped index pages with HTML anchor IDs matching the slug.
 * This helper centralizes the `/glossary/letter/<x>#<slug>` shape so
 * callers stay consistent if the routing changes later.
 *
 * Lives in its own module (no DB / Drizzle imports) so client
 * components can import it without dragging the `postgres` package
 * into the browser bundle.
 */
export function buildGlossaryUrlForSlug(slug: string): string {
  const firstLetter = slug.charAt(0).toLowerCase();
  // Defensive fallback: slugs are generated from term_en so they
  // always start with a-z, but if a future seed lands a non-Latin
  // first letter we route to the index instead of a 404.
  if (!/^[a-z]$/.test(firstLetter)) {
    return `/glossary#${slug}`;
  }
  return `/glossary/letter/${firstLetter}#${slug}`;
}
