/**
 * Sanitize an untrusted user-supplied text fragment for storage and display.
 *
 * @description
 * Generic sanitizer for short text fields (PGN headers, FEN captions, alt
 * text-style strings) that originate from users and pass through the post /
 * attachment write paths. The contract is the same as the older
 * `sanitizePgnHeader` helper that this module supersedes:
 *   - strips ASCII control characters (U+0000-U+001F and U+007F);
 *   - strips the Unicode bidi / zero-width / formatting controls that enable
 *     Trojan Source-style display attacks (CVE-2021-42574) and the extended
 *     supplementary-plane TAG / Musical Symbol formatter sets;
 *   - trims surrounding whitespace;
 *   - returns null for empty / whitespace-only inputs so callers can store
 *     NULL instead of an empty string;
 *   - caps the result at the caller-supplied `maxLength` (in JS string units;
 *     callers MUST keep this in sync with the underlying DB column width).
 *
 * @design Why generic / Q4=(c)
 *
 * #74 introduces a second user-supplied text channel (`post_fen_attachments.caption`)
 * with the exact same threat profile as `post_game_pgn_attachments.header_*`:
 * untrusted, bidi-injectable, length-bounded. Rather than duplicate the
 * regex constant, this module factors the strip + trim + cap pipeline behind
 * a single `sanitizeUserText({ value, maxLength })` call. `sanitizePgnHeader`
 * and the new `sanitizeFenCaption` are thin parameter binders on top of it,
 * so the sanitization vocabulary stays single-sourced. Adding another
 * untrusted text field in the future is a one-line wrapper.
 *
 * @design Defense in depth
 *
 * Even after sanitization, callers MUST still render values as a React text
 * child (`<span>{value}</span>`) — never as `href`, `dangerouslySetInnerHTML`,
 * or auto-linked content. React's text-child escaping is the second layer.
 *
 * @design Bidi / zero-width strip rationale
 *
 * The Unicode bidi-override and isolate codepoints (U+202A..U+202E,
 * U+2066..U+2069) reorder visible text without changing the underlying
 * codepoints. The zero-width family (U+200B..U+200D, U+2060, U+FEFF) and the
 * extended invisible / formatter sets (U+061C, U+180E, Musical Symbol formatters
 * U+1D173..U+1D17A, TAG block U+E0001 + U+E0020..U+E007F) provide invisible
 * separators / "ghost text" channels that have been used to defeat
 * exact-match moderation rules and to smuggle hidden instructions past LLMs.
 * Stripping at the input layer removes both display-spoofing and downstream
 * prompt-injection vectors.
 */

// Strip several classes of invisible / control characters in one pass. See
// `sanitize-pgn-header.ts` (now a thin wrapper) for the full per-codepoint
// rationale; this regex must remain byte-for-byte identical to the historical
// version so existing PGN-header tests keep passing.
const CONTROL_CHARS_RE = new RegExp(
  // eslint-disable-next-line no-control-regex
  '[\\x00-\\x1F\\x7F\\u061C\\u180E\\u200B-\\u200D\\u2060\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]|[\\u{1D173}-\\u{1D17A}]|[\\u{E0001}\\u{E0020}-\\u{E007F}]',
  'gu'
);

export interface SanitizeUserTextOptions {
  /**
   * Hard cap on the returned string length, in JS string units (UTF-16 code
   * units). Callers MUST keep this aligned with the underlying DB column
   * width so a CHECK violation cannot be triggered by a value that survived
   * sanitization.
   */
  maxLength: number;
}

/**
 * Sanitize a single user-supplied text fragment.
 *
 * Returns `null` for `null` / `undefined` / non-string input, for empty /
 * whitespace-only strings, and for strings that consist entirely of
 * stripped invisible characters. Otherwise returns the trimmed,
 * control-stripped, length-capped string.
 */
export function sanitizeUserText(
  value: string | null | undefined,
  options: SanitizeUserTextOptions
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const stripped = value.replace(CONTROL_CHARS_RE, '');
  const trimmed = stripped.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, options.maxLength);
}
