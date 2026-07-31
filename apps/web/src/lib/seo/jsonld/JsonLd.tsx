/**
 * Renders JSON-LD structured data as a script tag.
 *
 * @remarks
 * The serialized JSON is escaped to prevent breaking out of the surrounding
 * `<script>` block:
 *
 * - `<` becomes the JSON escape `<` so a payload containing
 *   `</script>` cannot close the tag.
 * - U+2028 / U+2029 (line/paragraph separators) are escaped because they
 *   are valid inside JSON strings but terminate JavaScript statements in
 *   some parsers -- belt-and-braces against XSS via those code points.
 *
 * `JSON.stringify` alone does not escape any of these characters.
 *
 * No CSP nonce is attached, deliberately. `application/ld+json` is a data
 * block per the HTML spec: "prepare the script element" returns before any
 * fetch, execution, or CSP inline-behavior check for script types that are
 * not classic / module / importmap, so `script-src` never applies to this
 * element. An earlier revision threaded a per-request nonce through every
 * caller "just in case" -- that plumbing required a `headers()` read in each
 * calling Server Component, which forced otherwise-static pages into
 * dynamic rendering. Should some exotic browser ever diverge from the spec
 * here, the report-only CSP (`/api/csp-report`, issue #89) would surface it
 * as violation reports before any enforcement change could break rendering.
 *
 * Keeping the component free of `next/headers` also means `JsonLd` -- and
 * the components that compose it (notably `Breadcrumb`) -- stay importable
 * from Client Components without tripping Next.js' "This API is only
 * available in Server Components" error during `next build`.
 */
export function JsonLd({ data }: { data: object }) {
  const safe = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
