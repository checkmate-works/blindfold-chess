/**
 * Sanitize a PGN header value for storage and display.
 *
 * @description
 * Thin wrapper around the generic
 * {@link import('../security/sanitize-user-text').sanitizeUserText} helper
 * with the PGN-header column cap pinned (200 chars — matches the widest of
 * `post_game_pgn_attachments.header_*` columns; the slice keeps every
 * downstream column safe under one rule).
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

export function sanitizePgnHeader(value: string | null | undefined): string | null {
  return sanitizeUserText(value, { maxLength: PGN_HEADER_MAX_LENGTH });
}
