import { isValidCountryCode } from '@/lib/countries';

import {
  CHESS_USERNAME_PATTERN,
  FIDE_ID_PATTERN,
  INSTAGRAM_USERNAME_PATTERN,
  X_USERNAME_PATTERN,
  YOUTUBE_HANDLE_PATTERN,
} from './profile-field-rules';

/** Raw, untrusted field values as they arrive from the client. */
export type ProfileInput = {
  displayName?: string;
  bio?: string;
  country?: string;
  flair?: string;
  fideId?: string;
  chesscomUsername?: string;
  lichessUsername?: string;
  xUsername?: string;
  instagramUsername?: string;
  youtubeHandle?: string;
};

/**
 * Validated, normalized values ready to be written to `profiles`. Optional
 * fields are `null` (not `undefined` / `''`) so the update is a genuine
 * full overwrite and the activity-log diff compares like with like.
 */
export type ProfileWriteValues = {
  displayName: string;
  bio: string | null;
  country: string | null;
  flair: string | null;
  fideId: string | null;
  chesscomUsername: string | null;
  lichessUsername: string | null;
  xUsername: string | null;
  instagramUsername: string | null;
  youtubeHandle: string | null;
};

/** The keys written by a profile update, in the order the log lists them. */
export const PROFILE_WRITE_KEYS = [
  'displayName',
  'bio',
  'country',
  'flair',
  'fideId',
  'chesscomUsername',
  'lichessUsername',
  'xUsername',
  'instagramUsername',
  'youtubeHandle',
] as const satisfies readonly (keyof ProfileWriteValues)[];

/**
 * Error codes surfaced to the client. They are the keys of
 * `SERVER_ERROR_MAP` in `./profile-validation`, which turns each into an
 * i18n message next to the offending field — so these strings are part of
 * the client contract and must not be renamed casually.
 */
export type ProfileValidationError =
  | 'display_name_required'
  | 'display_name_too_long'
  | 'display_name_inappropriate'
  | 'bio_too_long'
  | 'invalid_country'
  | 'flair_too_long'
  | 'fide_id_too_long'
  | 'fide_id_invalid_format'
  | 'chesscom_username_too_long'
  | 'chesscom_username_invalid_format'
  | 'lichess_username_too_long'
  | 'lichess_username_invalid_format'
  | 'x_username_too_long'
  | 'x_username_invalid_format'
  | 'instagram_username_too_long'
  | 'instagram_username_invalid_format'
  | 'youtube_handle_too_long'
  | 'youtube_handle_invalid_format';

export type ProfileValidationResult =
  { ok: true; values: ProfileWriteValues } | { ok: false; error: ProfileValidationError };

/** Per-field limit + pattern for the optional free-text fields. */
type OptionalFieldRule = {
  readonly maxLength: number;
  readonly tooLong: ProfileValidationError;
  readonly pattern?: RegExp;
  readonly invalidFormat?: ProfileValidationError;
};

const OPTIONAL_FIELD_RULES = {
  flair: { maxLength: 50, tooLong: 'flair_too_long' },
  fideId: {
    maxLength: 50,
    tooLong: 'fide_id_too_long',
    pattern: FIDE_ID_PATTERN,
    invalidFormat: 'fide_id_invalid_format',
  },
  chesscomUsername: {
    maxLength: 255,
    tooLong: 'chesscom_username_too_long',
    pattern: CHESS_USERNAME_PATTERN,
    invalidFormat: 'chesscom_username_invalid_format',
  },
  lichessUsername: {
    maxLength: 255,
    tooLong: 'lichess_username_too_long',
    pattern: CHESS_USERNAME_PATTERN,
    invalidFormat: 'lichess_username_invalid_format',
  },
  xUsername: {
    maxLength: 15,
    tooLong: 'x_username_too_long',
    pattern: X_USERNAME_PATTERN,
    invalidFormat: 'x_username_invalid_format',
  },
  instagramUsername: {
    maxLength: 30,
    tooLong: 'instagram_username_too_long',
    pattern: INSTAGRAM_USERNAME_PATTERN,
    invalidFormat: 'instagram_username_invalid_format',
  },
  youtubeHandle: {
    maxLength: 30,
    tooLong: 'youtube_handle_too_long',
    pattern: YOUTUBE_HANDLE_PATTERN,
    invalidFormat: 'youtube_handle_invalid_format',
  },
} as const satisfies Record<string, OptionalFieldRule>;

type OptionalFieldName = keyof typeof OPTIONAL_FIELD_RULES;

/** Trim, then collapse an empty result to `null`. */
function normalize(value: string | undefined): string | null {
  return value?.trim() || null;
}

/**
 * Validate and normalize one profile update.
 *
 * Pure: the profanity check is injected rather than imported, because
 * `@/lib/content/lame-name` is `server-only` and pulling it in would make
 * this module — the one piece of `updateProfile` worth testing exhaustively
 * — unloadable outside a server environment. The Server Action supplies the
 * real `isLameName`.
 *
 * Extracted from the action so these rules can be exercised directly: they
 * previously sat inline among the auth guard, the previous-row SELECT, the
 * UPDATE and the activity-log write, so every rule assertion had to stand up
 * a mocked database, Supabase client and rate limiter first.
 */
export function validateProfileInput(
  input: ProfileInput,
  deps: { isLameName: (name: string) => boolean }
): ProfileValidationResult {
  // Display name does not require uniqueness (same approach as X/Instagram).
  // Username serves as the unique identifier.
  const displayName = input.displayName?.trim();
  if (!displayName) {
    return { ok: false, error: 'display_name_required' };
  }
  if (displayName.length > 50) {
    return { ok: false, error: 'display_name_too_long' };
  }
  if (deps.isLameName(displayName)) {
    return { ok: false, error: 'display_name_inappropriate' };
  }

  const bio = normalize(input.bio);
  if (bio && bio.length > 500) {
    return { ok: false, error: 'bio_too_long' };
  }

  // Real ISO 3166-1 alpha-2 membership, matching the client-side rule in
  // `./profile-validation`. A bare two-letter regex here used to accept
  // codes like "ZZ" that the client form rejects.
  const country = input.country?.trim().toUpperCase() || null;
  if (country && !isValidCountryCode(country)) {
    return { ok: false, error: 'invalid_country' };
  }

  const optional = {} as Record<OptionalFieldName, string | null>;
  for (const field of Object.keys(OPTIONAL_FIELD_RULES) as OptionalFieldName[]) {
    const rule: OptionalFieldRule = OPTIONAL_FIELD_RULES[field];
    const value = normalize(input[field]);
    if (value) {
      if (value.length > rule.maxLength) {
        return { ok: false, error: rule.tooLong };
      }
      if (rule.pattern && rule.invalidFormat && !rule.pattern.test(value)) {
        return { ok: false, error: rule.invalidFormat };
      }
    }
    optional[field] = value;
  }

  return { ok: true, values: { displayName, bio, country, ...optional } };
}
