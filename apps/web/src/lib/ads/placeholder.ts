/**
 * The href a creative carries before anyone has pasted a real destination
 * into it, and the test that recognizes it again.
 *
 * Every slot is seeded with inactive creatives so that a fresh database
 * already carries the copy and thumbnail of each card, and going live is a
 * matter of pasting in a link and switching it on. Until that link exists
 * the seed writes this one, so the rows are complete in every respect except
 * the one that matters: the link goes nowhere. Activating it would put a card on a live surface that sends the
 * reader to `example.com`, which is worse than showing no ad.
 *
 * So activation is gated on the href no longer being a placeholder. The test
 * is the host rather than an exact string match on {@link PLACEHOLDER_AD_HREF},
 * because an admin part-way through editing (swapping the path, keeping the
 * host) is exactly as unready as one who has not started. RFC 2606 reserves
 * `example.com` / `.net` / `.org` and the `.example` TLD for documentation
 * precisely so they can never resolve to anyone's real site, which makes
 * "the host is one of those" a sound definition of "not a destination" and
 * not a heuristic that could one day reject a legitimate link.
 *
 * The gate is a write-time rule only. Nothing filters placeholders out at
 * read time, on purpose: `is_active` is the single condition that decides
 * whether a creative is served (see its TSDoc in
 * `@/lib/db/schema/notifications`), and a second, invisible condition would
 * be the silent-drop behaviour the JSONB payload used to have and that the
 * column migration removed.
 */

/**
 * The destination the seed writes. The path spells out what to do with it,
 * because this string is what an admin sees in the form's URL field.
 */
export const PLACEHOLDER_AD_HREF = 'https://example.com/replace-with-the-affiliate-url';

/** Hosts that can never be a real destination — RFC 2606 §3. */
const RESERVED_HOSTS = ['example.com', 'example.net', 'example.org'] as const;

/**
 * Whether `href` still points at a documentation host, and therefore at
 * nothing. An unparseable href is not a placeholder: it is invalid, which is
 * the href validator's business, not this one's.
 */
export function isPlaceholderAdHref(href: string): boolean {
  let host: string;
  try {
    host = new URL(href).hostname.toLowerCase();
  } catch {
    return false;
  }
  return (
    host === 'example' ||
    host.endsWith('.example') ||
    RESERVED_HOSTS.some((reserved) => host === reserved || host.endsWith(`.${reserved}`))
  );
}
