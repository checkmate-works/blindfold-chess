/**
 * Sanitize a FEN-attachment caption for storage and display.
 *
 * @description
 * Thin wrapper around the generic
 * {@link import('@/lib/security/sanitize-user-text').sanitizeUserText} helper
 * with the caption column cap pinned (200 chars — matches the
 * `post_fen_attachments.caption` column width).
 *
 * @design Defense in depth
 *
 * The caption is rendered next to the mini-board and is therefore another
 * vector for Trojan Source / zero-width / "ghost text" attacks. Stripping
 * runs at write time; callers MUST still render the value as a React text
 * child (never as `href`, `dangerouslySetInnerHTML`, or auto-linked content).
 *
 * @design Single-source strip set
 *
 * The strip set is shared with `sanitizePgnHeader`. Adding or refining a
 * codepoint class belongs in `sanitizeUserText`, not here.
 */
import { sanitizeUserText } from '@/lib/security/sanitize-user-text';

import { FEN_CAPTION_MAX_LENGTH } from './constants';

export function sanitizeFenCaption(value: string | null | undefined): string | null {
  return sanitizeUserText(value, { maxLength: FEN_CAPTION_MAX_LENGTH });
}
