const COUNTRY_CODE_PATTERN = /^[A-Za-z]{2}$/;
const FIDE_ID_PATTERN = /^\d+$/;
const CHESS_USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const X_USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const INSTAGRAM_USERNAME_PATTERN = /^[a-zA-Z0-9._]+$/;
const YOUTUBE_HANDLE_PATTERN = /^[a-zA-Z0-9._-]+$/;

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

export type ProfileFields = {
  displayName: string;
  bio: string;
  country: string;
  flair: string;
  fideId: string;
  chesscomUsername: string;
  lichessUsername: string;
  xUsername: string;
  instagramUsername: string;
  youtubeHandle: string;
};

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
  if (fields.country && !COUNTRY_CODE_PATTERN.test(fields.country)) {
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
