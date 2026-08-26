/**
 * Character limits for the free-text fields of a `profiles` row.
 *
 * Every place that has to agree on them reads from here: the Server Actions
 * that write the columns (`setUsername` at registration, `updateProfile` and
 * `saveOnboardingProfile` afterwards), the client-side validator, and the
 * `maxLength` on each input.
 *
 * The limits are deliberately smaller than the storage behind them —
 * `display_name` is `varchar(255)` and `bio` is `text` — so they are product
 * decisions, and the database will never be the thing that rejects a value.
 * That makes agreement between the copies the only guarantee there is, and
 * the copies are not redundant: an input's `maxLength` constrains typing
 * only, so an action that disagreed with it would either reject a value the
 * form invited the user to type, or accept one the profile editor then
 * refuses to save. The latter is what happened while these limits were bare
 * literals: `setUsername` — the action that creates the profile — had no
 * display-name check at all, so a registration submitted past the form could
 * store a 51–255 character display name that `/mypage/profile` then rejected
 * with `display_name_too_long` on every save.
 */

/** Maximum length of `profiles.display_name`, in characters. */
export const DISPLAY_NAME_MAX_LENGTH = 50;

/** Maximum length of `profiles.bio`, in characters. */
export const BIO_MAX_LENGTH = 500;
