/**
 * Sanitize a PGN header value for storage and display.
 *
 * @description
 * Thin wrapper around the generic
 * {@link import('../security/sanitize-user-text').sanitizeUserText} helper.
 *
 * The `post_game_pgn_attachments.header_*` columns are not one width —
 * `header_white` / `header_black` are 100, `header_result` 10, `header_date`
 * 20, `header_event` / `header_site` 200 — and chess.js accepts a header value
 * of any length. A writer must therefore pass the width of the column the
 * value is going into as `maxLength`; anything longer is rejected by Postgres
 * as `22001` at INSERT. The 200-char default only bounds callers that do not
 * store the value.
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
 * @design Strip rationale
 *
 * See {@link import('../security/sanitize-user-text').sanitizeUserText} for
 * the full Trojan Source / zero-width / TAG / Musical Symbol formatter
 * rationale. Historical inline notes have moved there so the strip set is
 * single-sourced.
 */
import { sanitizeUserText } from '@/lib/security/sanitize-user-text';

const PGN_HEADER_MAX_LENGTH = 200;

export function sanitizePgnHeader(
  value: string | null | undefined,
  maxLength: number = PGN_HEADER_MAX_LENGTH
): string | null {
  return sanitizeUserText(value, { maxLength });
}
