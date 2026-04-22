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
 * The per-request CSP nonce is passed in as the `nonce` prop so
 * `<script type="application/ld+json">` passes the enforcing `script-src`
 * policy set by `src/proxy.ts`. While `application/ld+json` is not
 * executable JavaScript, browsers still match it against `script-src` and
 * will block unnonced tags under a strict policy.
 *
 * `nonce` is accepted as a prop (rather than read inside this component via
 * `next/headers`) so the module does not statically depend on any
 * server-only API. Keeping that dependency out means `JsonLd` -- and the
 * components that compose it (notably `Breadcrumb`) -- stay importable from
 * Client Components without tripping Next.js' "This API is only available
 * in Server Components" error during `next build`. Server Components that
 * need a nonce read it via `resolveCspNonce()` from `@/lib/security/nonce`
 * and forward it here.
 */
export function JsonLd({ data, nonce }: { data: object; nonce?: string }) {
  const safe = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
