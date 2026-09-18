/**
 * Maximum length, in characters, of the reason an admin types when performing
 * a write that is recorded in `moderation_actions`.
 *
 * This is an operational ceiling, not a database one. Both
 * `moderation_actions.reason` and `user_grants.reason` are `text` columns with
 * no length bound, so no insert is at risk of failing without this check. The
 * limit exists because of who reads the value: another admin scanning the
 * audit log, and — for a grant — the recipient, who gets it as the body of
 * their notification. A thousand characters is already longer than either
 * reader will get through, so anything past it is far more likely to be a
 * paste accident than a justification, and truncating it silently would
 * corrupt an audit record. Forms pass it as `maxLength` so the ceiling is
 * visible while typing rather than only after submitting.
 */
export const MODERATION_REASON_MAX_LENGTH = 1000;

export type ValidatedReason = { trimmed: string } | { error: 'reasonRequired' | 'reasonTooLong' };

/**
 * Trim + bound-check a moderation reason supplied by an admin.
 *
 * Used by every admin write that demands an audit-log justification — the
 * user-facing moderation actions (`banUser`, `deletePostAdmin`, `grantRank`)
 * and the bulk benefit grant — so that the error tokens (`reasonRequired`,
 * `reasonTooLong`) and the length ceiling stay identical across all of them.
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
