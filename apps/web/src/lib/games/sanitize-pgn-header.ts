/**
 * Sanitize a PGN header value for storage and display.
 *
 * @description
 * PGN header values (`White`, `Black`, `Event`, `Site`, `Date`, `Result`)
 * are untrusted input — even Lichess-sourced PGN can contain hostile values
 * if the gameId resolves to a manipulated record, and pasted PGN can carry
 * arbitrary text. This helper:
 *   - strips ASCII control characters (U+0000-U+001F and U+007F) which can
 *     break terminal output, log parsing, or downstream rendering;
 *   - strips Unicode bidirectional / zero-width / formatting controls
 *     that enable Trojan Source–style display attacks (CVE-2021-42574);
 *   - trims surrounding whitespace;
 *   - returns null for empty / whitespace-only inputs so callers can store
 *     NULL in the DB instead of an empty string;
 *   - caps the result at 200 characters, matching the column widths on
 *     `post_game_attachments` (`header_white`, `header_black` are 100;
 *     `header_event` and `header_site` are 200; the slice keeps every
 *     downstream column safe under one rule).
 *
 * @design Web-side, not chess-core
 *
 * `packages/features` is platform-pure. Web-specific sanitization decisions
 * (e.g. column widths, XSS-shape) belong here so the chess-core package
 * stays free of app-side coupling.
 *
 * @design Defense in depth
 *
 * Even after sanitization, callers MUST still render header values as a
 * React text child (`<span>{header.white}</span>`) — never as `href`,
 * `dangerouslySetInnerHTML`, or auto-linked content. React's text-child
 * escaping is the second layer.
 *
 * @design Bidi / zero-width strip rationale (M-4)
 *
 * The Unicode bidi-override and isolate codepoints (U+202A..U+202E,
 * U+2066..U+2069) reorder visible text without changing the underlying
 * codepoints — `Magnus` + U+202E + `suangaM` displays as `Magnus`
 * followed by its visible reverse, and `[White "evil` + U+202E +
 * `site.com"]` can render in the post card as if the host were
 * `evilmoc.etis`. CVE-2021-42574 ("Trojan Source")
 * documents the same trick used to hide payloads in source code; here
 * the impact is impersonation of legitimate sites in attached-game
 * attribution. Stripping these codepoints removes the attack vector
 * outright; we accept a small loss of fidelity for legitimate strings
 * that intentionally use bidi marks (extremely rare for player names
 * or event titles).
 *
 * The zero-width family (U+200B..U+200D, U+2060, U+FEFF) is stripped
 * for the same reason: invisible separators that produce different
 * stored/displayed strings than what the user sees, and let attackers
 * defeat exact-match moderation rules ("Hikaru" vs "Hi" + U+200B + "karu").
 */

const PGN_HEADER_MAX_LENGTH = 200;
// Strip three classes of invisible / control characters in one pass:
//   - U+0000..U+001F + U+007F: ASCII C0 controls + DEL
//   - U+200B..U+200D, U+2060, U+FEFF: zero-width family (ZWSP / ZWNJ /
//     ZWJ / WJ / ZWNBSP)
//   - U+202A..U+202E, U+2066..U+2069: bidi overrides + isolates
//     (Trojan Source — CVE-2021-42574)
// Built from a hex-escape string so this source file itself contains
// no literal invisible / bidi bytes (some editors and commit hooks
// silently strip them, which would silently weaken the regex).
const CONTROL_CHARS_RE = new RegExp(
  // eslint-disable-next-line no-control-regex
  '[\\x00-\\x1F\\x7F\\u200B-\\u200D\\u2060\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]',
  'g'
);

export function sanitizePgnHeader(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const stripped = value.replace(CONTROL_CHARS_RE, '');
  const trimmed = stripped.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, PGN_HEADER_MAX_LENGTH);
}
