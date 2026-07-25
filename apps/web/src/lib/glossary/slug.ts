/**
 * Canonical slug derivation for glossary terms.
 *
 * The English term name is the source of truth; the slug is a URL-safe,
 * lowercase, hyphenated form of it. This is shared between the seeder
 * (which writes `glossary_terms.slug`) and any code that needs to derive
 * the same slug without a DB round-trip (e.g. `generateStaticParams` for
 * `/glossary/[slug]`), so the two can never drift apart.
 */
export function slugifyTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}
