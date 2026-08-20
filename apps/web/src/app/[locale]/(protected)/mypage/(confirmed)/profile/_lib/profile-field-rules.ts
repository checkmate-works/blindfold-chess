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
