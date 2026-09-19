import { MODERATION_REASON_MAX_LENGTH } from '@/lib/moderation/validate-reason';

import { MAX_GRANT_DURATION_DAYS } from '../grants/_lib/validation';

/**
 * English text for every error code an admin Server Action can return.
 *
 * Admin actions answer with a code, never a sentence: several of them share a
 * failure (`unauthorized`, `reasonRequired`, `reasonTooLong` come from helpers
 * used by half the surface), and a code is the only way for those to stay one
 * fact instead of drifting into three near-identical strings. The sentence the
 * operator reads is chosen here, at the UI boundary, by `adminErrorMessage`.
 *
 * These are not in the i18n message files because the admin surface is
 * English-only by construction — every admin page pins
 * `getTranslations({ locale: 'en' })` — so a namespace entry would add a lookup
 * that can only ever resolve one way.
 */
const ADMIN_ERROR_MESSAGES = {
  unauthorized: 'You are not authorized to do this.',

  // Reason validation, shared by every admin write that records an audit
  // reason — see `validateModerationReason`.
  reasonRequired: 'Reason is required.',
  reasonTooLong: `Reason must be ${MODERATION_REASON_MAX_LENGTH} characters or fewer.`,

  // Benefit grants (/admin/grants).
  userIdRequired: 'User ID is required.',
  invalidUserId: 'User ID must be a UUID.',
  benefitTypeRequired: 'Benefit type is required.',
  unknownBenefitType: 'Unknown benefit type.',
  invalidDuration: 'Duration must be a positive number of days.',
  durationTooLong: `Duration must not exceed ${MAX_GRANT_DURATION_DAYS} days (10 years).`,
  noUsersSelected: 'No users selected.',
  grantIdRequired: 'Grant ID is required.',
  grantNotFound: 'That grant no longer exists.',
  alreadyRevoked: 'That grant has already been revoked.',
  failedToCreateGrant: 'Failed to create grant.',
  failedToCreateBulkGrants: 'Failed to create bulk grants.',
  failedToRevokeGrant: 'Failed to revoke grant.',
  failedToSearchUsers: 'Failed to search users.',

  // Users and moderation (/admin/users).
  cannotBanSelf: 'You cannot ban yourself.',
  failedToBan: 'Failed to ban user.',
  bannedButSubscriptionNotCanceled:
    'User was banned, but their Stripe subscription could not be canceled. Cancel it in the Stripe dashboard.',
  failedToUnban: 'Failed to unban user.',
  invalidRank: 'Unknown rank.',
  rankNotFound: 'That rank has no matching database row yet.',
  alreadyGranted: 'This user already holds that rank.',
  failedToGrantRank: 'Failed to grant rank.',
  postNotFound: 'That post no longer exists.',
} as const satisfies Record<string, string>;

/** Every failure an admin action is allowed to report. */
export type AdminErrorCode = keyof typeof ADMIN_ERROR_MESSAGES;

/**
 * Outcome of an admin Server Action, with the failures it can report named in
 * the type.
 *
 * Constraining `E` to {@link AdminErrorCode} is what keeps the convention
 * enforceable rather than aspirational: an action that returns a sentence, or
 * a code nobody wrote a message for, fails to compile instead of shipping a
 * bare slug into the confirmation modal.
 *
 * @template E The error codes this action can return
 * @template T Additional fields to include on success (e.g., `{ id: string }`)
 */
export type AdminActionResult<
  E extends AdminErrorCode,
  T extends Record<string, unknown> = Record<never, never>,
> = ({ success: true } & T) | { error: E };

const MESSAGES_BY_CODE: Record<string, string | undefined> = ADMIN_ERROR_MESSAGES;

/**
 * The sentence to show an admin for an error an action returned.
 *
 * Unknown input is handed back unchanged, which is what lets the admin hooks
 * apply this unconditionally: the actions still returning prose (ads,
 * articles, announcements, coins) pass through untouched, and converting one
 * of them is a matter of adding its codes above with no change at the call
 * site. Applying it in the hooks rather than per button is deliberate — the
 * per-component mapping it replaces was missing from three of the five
 * confirmation dialogs, and a missing mapping shows the operator the raw
 * token with nothing failing anywhere.
 */
export function adminErrorMessage(code: string): string {
  return MESSAGES_BY_CODE[code] ?? code;
}

/** The message for a code known at author time, e.g. for a client-side check. */
export function adminErrorMessageFor(code: AdminErrorCode): string {
  return ADMIN_ERROR_MESSAGES[code];
}
