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
 *     `post_game_pgn_attachments` (`header_white`, `header_black` are 100;
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
 *
 * @design Extended invisible / formatter coverage (Phase H)
 *
 * In addition to the bidi + zero-width sets above, the strip also
 * covers:
 *   - U+061C ARABIC LETTER MARK — formally classified as Bidi_Control
 *     since Unicode 6.3, same attack surface as U+202A..U+202E.
 *   - U+180E MONGOLIAN VOWEL SEPARATOR — deprecated but still rendered
 *     as zero-width by browsers; usable as an invisible separator.
 *   - U+1D173..U+1D17A Musical Symbol formatters — zero-width control
 *     codepoints from the supplementary plane (require the `u` flag).
 *   - U+E0001 + U+E0020..U+E007F TAG characters — an invisible
 *     "ghost text" channel that has been used to watermark or smuggle
 *     hidden instructions inside otherwise plain text. Stripping at
 *     the input layer prevents both display impersonation and
 *     downstream prompt-injection of an LLM that ingests the header.
 */

const PGN_HEADER_MAX_LENGTH = 200;
// Strip several classes of invisible / control characters in one pass:
//   - U+0000..U+001F + U+007F: ASCII C0 controls + DEL
//   - U+061C: ARABIC LETTER MARK (Bidi_Control formatter, Unicode 6.3+)
//   - U+180E: MONGOLIAN VOWEL SEPARATOR (deprecated, but still emitted by
//     some sources — zero-width and treated as invisible by browsers)
//   - U+200B..U+200D, U+2060, U+FEFF: zero-width family (ZWSP / ZWNJ /
//     ZWJ / WJ / ZWNBSP)
//   - U+202A..U+202E, U+2066..U+2069: bidi overrides + isolates
//     (Trojan Source — CVE-2021-42574)
//   - U+1D173..U+1D17A: Musical Symbol formatting (zero-width formatters
//     used to scope musical glyphs; abusable as invisible separators in
//     plain text)
//   - U+E0001 + U+E0020..U+E007F: TAG characters / "ghost text" — an
//     invisible-watermarking vector that has been used to smuggle
//     instructions past LLMs and to hide data inside otherwise normal
//     text. Stripping at the input layer prevents both display-spoofing
//     and downstream prompt-injection scenarios.
// Built from a hex-escape string so this source file itself contains
// no literal invisible / bidi bytes (some editors and commit hooks
// silently strip them, which would silently weaken the regex). The
// `u` flag is required for the `\u{...}` escapes that reach into the
// supplementary planes (TAG and Musical Symbol blocks).
const CONTROL_CHARS_RE = new RegExp(
  // eslint-disable-next-line no-control-regex
  '[\\x00-\\x1F\\x7F\\u061C\\u180E\\u200B-\\u200D\\u2060\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]|[\\u{1D173}-\\u{1D17A}]|[\\u{E0001}\\u{E0020}-\\u{E007F}]',
  'gu'
);

export function sanitizePgnHeader(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const stripped = value.replace(CONTROL_CHARS_RE, '');
  const trimmed = stripped.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, PGN_HEADER_MAX_LENGTH);
}
