/**
 * Format rules for the profile's free-text fields, shared by the client-side
 * form validator (`./profile-validation`) and the server-side input
 * validator (`./validate-profile-input`).
 *
 * The two validators are deliberately not one function — the client reports
 * i18n message keys against a live form, the server reports stable error
 * codes and also enforces the length limits the form's `maxLength` handles
 * in the browser. What they must never disagree on is what counts as a
 * well-formed value, so the patterns live here rather than being written
 * twice. (They had already drifted once: the server accepted any two
 * uppercase letters as a country while the client checked ISO 3166-1
 * membership.)
 */

export const FIDE_ID_PATTERN = /^\d+$/;
export const CHESS_USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const X_USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
export const INSTAGRAM_USERNAME_PATTERN = /^[a-zA-Z0-9._]+$/;
export const YOUTUBE_HANDLE_PATTERN = /^[a-zA-Z0-9._-]+$/;

/**
 * Character limits for the optional free-text fields. The server rejects a
 * longer value with the field's `*_too_long` code, and the form sets each
 * input's `maxLength` to the same number so the browser never lets the user
 * type a value that save would refuse.
 */
export const OPTIONAL_FIELD_MAX_LENGTH = {
  flair: 50,
  fideId: 50,
  chesscomUsername: 255,
  lichessUsername: 255,
  xUsername: 15,
  instagramUsername: 30,
  youtubeHandle: 30,
} as const;
