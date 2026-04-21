import { headers } from 'next/headers';

/**
 * Renders JSON-LD structured data as a script tag.
 *
 * @remarks
 * The serialized JSON is escaped to prevent breaking out of the surrounding
 * `<script>` block:
 * - `<` becomes `<` so a payload containing `</script>` cannot close the
 *   tag.
 * - U+2028 / U+2029 (line/paragraph separators) are escaped because they are
 *   valid inside JSON strings but terminate JavaScript statements in some
 *   parsers — belt-and-braces against XSS via those code points.
 *
 * `JSON.stringify` alone does not escape any of these characters.
 *
 * The per-request CSP nonce is attached so `<script type="application/ld+json">`
 * passes the enforcing `script-src` policy set by `src/proxy.ts`. While
 * `application/ld+json` is not executable JavaScript, browsers still match
 * it against `script-src` and will block unnonced tags under a strict
 * policy.
 */
export async function JsonLd({ data }: { data: object }) {
  const safe = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: safe }} />
  );
}
