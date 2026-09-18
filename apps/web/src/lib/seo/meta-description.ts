/**
 * Cut-off for a meta description built from free-text body content. Google
 * renders roughly 150–160 characters of a description in a result snippet;
 * anything past that is never shown, so it is dead weight that only dilutes
 * the part that is.
 *
 * The ellipsis counts against this budget — see `toMetaDescription`.
 */
export const META_DESCRIPTION_MAX = 160;

/** U+2026 HORIZONTAL ELLIPSIS. One character, not three periods. */
const ELLIPSIS = '…';

/**
 * Build the description a page reports to search engines from its own body
 * text. Every surface that describes a page by excerpting its content — the
 * `<meta name="description">` tag, the `openGraph.description`, and the
 * `description` of the page's JSON-LD node — must call this, so that a single
 * page never reports two different descriptions of itself.
 *
 * Three things happen, in this order:
 *
 * 1. **Whitespace collapses.** Runs of `\s` (newlines, tabs, blank lines,
 *    non-breaking and ideographic spaces) become one plain space, and the
 *    result is trimmed. Body text comes from Markdown sources and multi-line
 *    textareas, whose newlines otherwise survive verbatim into the attribute
 *    value; collapsing first also stops the cut-off from spending its budget
 *    on a run of blank lines.
 * 2. **Truncation to `max` characters**, counting the ellipsis. A cut string
 *    is `max - 1` characters plus `…`, never `max + 1`, so the declared limit
 *    is the real one. It can come back one or two characters shorter when the
 *    cut lands on a space (no ` …`) or inside a surrogate pair (see below).
 * 3. **The ellipsis is appended only when something was actually removed.**
 *    Text that already fits comes back untouched, with no trailing marker
 *    suggesting content that does not exist.
 *
 * Applying this twice is a no-op: its own output is at most `max` characters
 * with collapsed whitespace, so the second call finds nothing to collapse and
 * nothing to cut, and cannot append a second ellipsis.
 *
 * Empty, whitespace-only, `null` and `undefined` input all return `''`.
 * Callers that must omit the key entirely (rather than emit an empty
 * description) spell that as `toMetaDescription(x) || undefined`.
 *
 * **Truncation splits graphemes, and deliberately so — with one exception.**
 * Cutting at a fixed character count can land after a base character but
 * before its combining mark, or inside a ZWJ emoji sequence, so `👨‍👩‍👧` may
 * come back as `👨`. That is a visually different but perfectly valid string,
 * and the appended `…` already tells the reader the text was cut. Segmenting
 * by grapheme cluster to avoid it would buy nothing a search snippet cares
 * about. The exception is a cut *between the two halves of a surrogate pair*,
 * which is not a valid string at all — a lone surrogate is unrepresentable in
 * UTF-8 and serializes as U+FFFD — so the dangling half is dropped instead.
 *
 * @param text - Body content to describe the page with
 * @param max - Character budget including the ellipsis
 */
export function toMetaDescription(
  text: string | null | undefined,
  max = META_DESCRIPTION_MAX
): string {
  if (!text) return '';

  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;

  let cut = normalized.slice(0, max - ELLIPSIS.length);
  // A high surrogate in the final position means its low surrogate was just
  // cut away; keeping it would emit a lone surrogate.
  const lastCode = cut.charCodeAt(cut.length - 1);
  if (lastCode >= 0xd800 && lastCode <= 0xdbff) {
    cut = cut.slice(0, -1);
  }

  return `${cut.trimEnd()}${ELLIPSIS}`;
}
