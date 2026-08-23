import { isValidCountryCode } from '@/lib/countries';

import {
  CHESS_USERNAME_PATTERN,
  FIDE_ID_PATTERN,
  INSTAGRAM_USERNAME_PATTERN,
  X_USERNAME_PATTERN,
  YOUTUBE_HANDLE_PATTERN,
} from './profile-field-rules';
import type { ProfileFieldKey } from './validate-profile-input';

const VALIDATION_RULES: { field: string; regex: RegExp; errorKey: string }[] = [
  { field: 'fideId', regex: FIDE_ID_PATTERN, errorKey: 'fideIdInvalidFormat' },
  {
    field: 'chesscomUsername',
    regex: CHESS_USERNAME_PATTERN,
    errorKey: 'chesscomUsernameInvalidFormat',
  },
  {
    field: 'lichessUsername',
    regex: CHESS_USERNAME_PATTERN,
    errorKey: 'lichessUsernameInvalidFormat',
  },
  { field: 'xUsername', regex: X_USERNAME_PATTERN, errorKey: 'xUsernameInvalidFormat' },
  {
    field: 'instagramUsername',
    regex: INSTAGRAM_USERNAME_PATTERN,
    errorKey: 'instagramUsernameInvalidFormat',
  },
  { field: 'youtubeHandle', regex: YOUTUBE_HANDLE_PATTERN, errorKey: 'youtubeHandleInvalidFormat' },
];

export const SERVER_ERROR_MAP: Record<string, { messageKey: string; field: string }> = {
  display_name_required: { messageKey: 'displayNameRequired', field: 'displayName' },
  display_name_inappropriate: { messageKey: 'displayNameInappropriate', field: 'displayName' },
  bio_too_long: { messageKey: 'bioMaxLength', field: 'bio' },
  invalid_country: { messageKey: 'countryInvalid', field: 'country' },
  fide_id_invalid_format: { messageKey: 'fideIdInvalidFormat', field: 'fideId' },
  chesscom_username_invalid_format: {
    messageKey: 'chesscomUsernameInvalidFormat',
    field: 'chesscomUsername',
  },
  lichess_username_invalid_format: {
    messageKey: 'lichessUsernameInvalidFormat',
    field: 'lichessUsername',
  },
  x_username_invalid_format: { messageKey: 'xUsernameInvalidFormat', field: 'xUsername' },
  instagram_username_invalid_format: {
    messageKey: 'instagramUsernameInvalidFormat',
    field: 'instagramUsername',
  },
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
 * Validate profile fields. Returns null if valid, or a ValidationError with an
 * i18n message key and optional field name.
 */
export function validateProfileFields(fields: ProfileFields): ValidationError | null {
  if (!fields.displayName.trim()) {
    return { messageKey: 'displayNameRequired', field: 'displayName' };
  }
  if (fields.bio.length > 500) {
    return { messageKey: 'bioMaxLength', field: 'bio' };
  }
  // Real ISO 3166-1 alpha-2 membership (not just two letters). Uppercased so a
  // legacy lowercase value already in the DB doesn't block re-saving.
  if (fields.country && !isValidCountryCode(fields.country.toUpperCase())) {
    return { messageKey: 'countryInvalid', field: 'country' };
  }

  const fieldValues: Record<string, string> = {
    fideId: fields.fideId,
    chesscomUsername: fields.chesscomUsername,
    lichessUsername: fields.lichessUsername,
    xUsername: fields.xUsername,
    instagramUsername: fields.instagramUsername,
    youtubeHandle: fields.youtubeHandle,
  };

  for (const rule of VALIDATION_RULES) {
    const value = fieldValues[rule.field].trim();
    if (value && !rule.regex.test(value)) {
      return { messageKey: rule.errorKey, field: rule.field };
    }
  }

  return null;
}
