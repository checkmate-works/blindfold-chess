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
 */

const PGN_HEADER_MAX_LENGTH = 200;
// ASCII C0 controls (U+0000-U+001F) plus DEL (U+007F). Constructed via
// `RegExp` from a hex-escape string so the source file itself contains no
// literal control bytes (which some editors / commit hooks strip silently).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = new RegExp('[\\x00-\\x1F\\x7F]', 'g');

export function sanitizePgnHeader(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const stripped = value.replace(CONTROL_CHARS_RE, '');
  const trimmed = stripped.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, PGN_HEADER_MAX_LENGTH);
}
