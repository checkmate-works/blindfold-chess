import {
  type ProfileFieldKey,
  type ProfileValidationError,
  validateProfileInput,
} from './validate-profile-input';

/**
 * Where each server error code lands on the form: the i18n message key under
 * `profile` and the field to highlight.
 *
 * Exhaustive over {@link ProfileValidationError}, so a rule added on the
 * server is a compile error here until the form knows how to show it. The
 * optional fields' `*_too_long` codes map to the generic message because each
 * input's `maxLength` (set from `OPTIONAL_FIELD_MAX_LENGTH`) keeps a user from
 * typing such a value in the first place.
 */
export const SERVER_ERROR_MAP: Record<
  ProfileValidationError,
  { messageKey: string; field: ProfileFieldKey }
> = {
  display_name_required: { messageKey: 'displayNameRequired', field: 'displayName' },
  display_name_too_long: { messageKey: 'displayNameMaxLength', field: 'displayName' },
  display_name_inappropriate: { messageKey: 'displayNameInappropriate', field: 'displayName' },
  display_name_impersonation: { messageKey: 'displayNameImpersonation', field: 'displayName' },
  bio_too_long: { messageKey: 'bioMaxLength', field: 'bio' },
  invalid_country: { messageKey: 'countryInvalid', field: 'country' },
  flair_too_long: { messageKey: 'error', field: 'flair' },
  fide_id_too_long: { messageKey: 'error', field: 'fideId' },
  fide_id_invalid_format: { messageKey: 'fideIdInvalidFormat', field: 'fideId' },
  chesscom_username_too_long: { messageKey: 'error', field: 'chesscomUsername' },
  chesscom_username_invalid_format: {
    messageKey: 'chesscomUsernameInvalidFormat',
    field: 'chesscomUsername',
  },
  lichess_username_too_long: { messageKey: 'error', field: 'lichessUsername' },
  lichess_username_invalid_format: {
    messageKey: 'lichessUsernameInvalidFormat',
    field: 'lichessUsername',
  },
  x_username_too_long: { messageKey: 'error', field: 'xUsername' },
  x_username_invalid_format: { messageKey: 'xUsernameInvalidFormat', field: 'xUsername' },
  instagram_username_too_long: { messageKey: 'error', field: 'instagramUsername' },
  instagram_username_invalid_format: {
    messageKey: 'instagramUsernameInvalidFormat',
    field: 'instagramUsername',
  },
  youtube_handle_too_long: { messageKey: 'error', field: 'youtubeHandle' },
  youtube_handle_invalid_format: {
    messageKey: 'youtubeHandleInvalidFormat',
    field: 'youtubeHandle',
  },
};

/**
 * The same fields as {@link ProfileWriteValues}, but as the form holds them:
 * every one a string, because an empty input is `''` on the client and only
 * becomes `null` once validated for the write.
 */
export type ProfileFields = Record<ProfileFieldKey, string>;

export type ValidationError = { messageKey: string; field?: string };

/**
 * The form's rendering of an error code from `updateProfile`, or `null` for a
 * code the form does not know (the guard's `signInRequired` and friends),
 * which the caller shows as the generic message.
 */
export function describeProfileError(code: string): ValidationError | null {
  return Object.hasOwn(SERVER_ERROR_MAP, code)
    ? SERVER_ERROR_MAP[code as ProfileValidationError]
    : null;
}

/**
 * No profanity check on the client: `isLameName` is `server-only`, and the
 * Server Action runs the full validator again before writing, so a lame name
 * is still refused — just after a round trip. Every other rule (required,
 * length, format, country, homoglyph) runs here exactly as the server runs
 * it, which is what keeps the two from drifting.
 */
const CLIENT_DEPS = { isLameName: () => false };

/**
 * Validate the form's fields before submitting. Returns `null` when the
 * server would accept them, or the error to show next to the offending field.
 */
export function validateProfileFields(fields: ProfileFields): ValidationError | null {
  const result = validateProfileInput(fields, CLIENT_DEPS);
  return result.ok ? null : SERVER_ERROR_MAP[result.error];
}
