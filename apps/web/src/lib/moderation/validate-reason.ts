/**
 * Maximum length of an admin-supplied moderation reason. Mirrors the column
 * constraint and the UI form's `maxLength`.
 */
const MODERATION_REASON_MAX_LENGTH = 1000;

export type ValidatedReason = { trimmed: string } | { error: 'reasonRequired' | 'reasonTooLong' };

/**
 * Trim + bound-check a moderation reason supplied by an admin.
 *
 * Used by `banUser` and `deletePostAdmin` (and future moderation actions) so
 * the error tokens (`reasonRequired`, `reasonTooLong`) stay consistent across
 * every admin write that demands an audit-log justification.
 */
export function validateModerationReason(reason: string): ValidatedReason {
  const trimmed = reason.trim();
  if (!trimmed) {
    return { error: 'reasonRequired' };
  }
  if (trimmed.length > MODERATION_REASON_MAX_LENGTH) {
    return { error: 'reasonTooLong' };
  }
  return { trimmed };
}
